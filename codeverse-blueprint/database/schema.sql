-- ============================================================================
-- CodeVerse: Production-Grade PostgreSQL Schema
-- Database: codeverse_prod
-- Version: 1.0.0
-- Last Updated: 2026-05-08
-- ============================================================================

-- ============================================================================
-- PART 1: CORE IDENTITY & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    username VARCHAR(100) NOT NULL UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    
    -- Authentication & OAuth
    auth_provider VARCHAR(50) NOT NULL, -- 'github', 'google', 'microsoft', 'email'
    provider_id VARCHAR(255),
    password_hash VARCHAR(255), -- Only for email-based auth
    password_reset_token VARCHAR(500),
    password_reset_expires_at TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    
    -- Account Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'deleted'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Custom user data (preferences, onboarding state)
    
    CONSTRAINT valid_auth_provider CHECK (auth_provider IN ('github', 'google', 'microsoft', 'email'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);

-- Multi-factor authentication
CREATE TABLE mfa_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL, -- 'totp', 'webauthn', 'sms'
    credential_data JSONB NOT NULL, -- Encrypted TOTP secret or WebAuthn challenge
    is_primary BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_credential_type CHECK (credential_type IN ('totp', 'webauthn', 'sms'))
);

CREATE INDEX idx_mfa_user ON mfa_credentials(user_id);

-- Session & API tokens
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(1000) NOT NULL UNIQUE,
    refresh_token VARCHAR(1000) NOT NULL UNIQUE,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    
    CONSTRAINT valid_token_type CHECK (token_type IN ('Bearer', 'Basic'))
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_access_token ON sessions(access_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- PART 2: WORKSPACE & FILE MANAGEMENT
-- ============================================================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE, -- URL-safe identifier
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- File system & storage
    root_path VARCHAR(500), -- S3 bucket path: /workspaces/{workspace_id}
    total_files INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- Collaboration settings
    max_collaborators INTEGER DEFAULT 5,
    max_size_bytes BIGINT DEFAULT 5368709120, -- 5 GB
    
    -- Version control
    git_repo_url TEXT,
    git_branch VARCHAR(255) DEFAULT 'main',
    last_synced_at TIMESTAMP,
    
    -- Metadata
    language_primary VARCHAR(50), -- Default: 'python', 'javascript', 'java', 'cpp', 'c', etc.
    tags VARCHAR(500)[] DEFAULT '{}',
    is_template BOOLEAN DEFAULT FALSE,
    template_version VARCHAR(50),
    
    -- Soft delete & archival
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_public ON workspaces(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- Workspace collaborators (multi-user editing)
CREATE TABLE workspace_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'owner', 'editor', 'viewer', 'commenter'
    invited_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP,
    permissions JSONB DEFAULT '{}', -- Custom permission grants
    
    UNIQUE(workspace_id, user_id),
    CONSTRAINT valid_role CHECK (role IN ('owner', 'editor', 'viewer', 'commenter'))
);

CREATE INDEX idx_collaborators_user ON workspace_collaborators(user_id);
CREATE INDEX idx_collaborators_workspace ON workspace_collaborators(workspace_id);

-- Files in workspace
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE, -- For folder hierarchy
    
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1000) NOT NULL, -- Full path relative to workspace root
    file_type VARCHAR(50) NOT NULL, -- 'file', 'folder', 'symlink'
    language VARCHAR(50), -- 'python', 'cpp', 'java', 'javascript', etc.
    mime_type VARCHAR(100),
    
    -- Content & versioning
    size_bytes BIGINT DEFAULT 0,
    content_hash VARCHAR(64), -- SHA-256 for deduplication
    s3_key VARCHAR(500), -- Full S3 path for retrieval
    is_binary BOOLEAN DEFAULT FALSE,
    encoding VARCHAR(50) DEFAULT 'utf-8',
    
    -- Metadata
    is_executable BOOLEAN DEFAULT FALSE,
    is_readonly BOOLEAN DEFAULT FALSE,
    last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(workspace_id, path),
    CONSTRAINT valid_file_type CHECK (file_type IN ('file', 'folder', 'symlink'))
);

CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_files_parent ON files(parent_id);
CREATE INDEX idx_files_path ON files(workspace_id, path);
CREATE INDEX idx_files_language ON files(language);

-- File content history (CRDT sync state)
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_length BIGINT,
    change_summary VARCHAR(500),
    
    -- CRDT state
    yjs_state BYTEA, -- Serialized Yjs state vector
    clock_vector JSONB, -- Lamport clock or version vector
    
    -- Author & timestamp
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Commit metadata
    commit_hash VARCHAR(64), -- Git commit if synced
    commit_message TEXT,
    
    UNIQUE(file_id, version_number)
);

CREATE INDEX idx_versions_file ON file_versions(file_id);
CREATE INDEX idx_versions_created ON file_versions(created_at);

-- ============================================================================
-- PART 3: EXECUTION & SUBMISSIONS
-- ============================================================================

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Submission metadata
    submission_number INTEGER NOT NULL,
    language VARCHAR(50) NOT NULL,
    entry_point VARCHAR(255), -- main.cpp, main.py, Main.java
    
    -- Execution details
    status VARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- pending, running, completed, timeout, runtime_error, compilation_error, oom_killed
    
    execution_time_ms INTEGER, -- Wall-clock time
    cpu_time_ms INTEGER, -- Actual CPU time
    memory_used_mb INTEGER,
    peak_memory_mb INTEGER,
    
    exit_code INTEGER,
    
    -- Output & logs
    stdout_output TEXT,
    stderr_output TEXT,
    compiler_output TEXT,
    
    -- Performance analysis
    time_complexity_estimate VARCHAR(100), -- O(n), O(n log n), etc.
    space_complexity_estimate VARCHAR(100),
    
    -- Test results
    total_test_cases INTEGER DEFAULT 0,
    passed_test_cases INTEGER DEFAULT 0,
    failed_test_cases INTEGER DEFAULT 0,
    test_results JSONB DEFAULT '[]', -- Array of {test_id, passed, expected, actual, time_ms}
    
    -- Scoring (for coding challenges)
    points_earned INTEGER DEFAULT 0,
    max_points INTEGER DEFAULT 100,
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT NOW(),
    started_execution_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- AI analysis
    ai_feedback_generated BOOLEAN DEFAULT FALSE,
    ai_feedback JSONB, -- {improvements: [], bugs: [], complexity_analysis: ""}
    
    UNIQUE(workspace_id, submission_number),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'timeout', 'runtime_error', 'compilation_error', 'oom_killed', 'sandbox_error'))
);

CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_workspace ON submissions(workspace_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted ON submissions(submitted_at);
CREATE INDEX idx_submissions_language ON submissions(language);

-- Execution queue for load balancing
CREATE TABLE execution_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, assigned, running, complete, failed
    
    -- Queue management
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    queue_position INTEGER,
    queued_at TIMESTAMP DEFAULT NOW(),
    assigned_at TIMESTAMP,
    
    -- Execution node assignment
    executor_node_id VARCHAR(255), -- Kubernetes pod name
    executor_region VARCHAR(100), -- Geographic region for latency optimization
    execution_timeout_seconds INTEGER DEFAULT 30,
    
    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    
    completed_at TIMESTAMP,
    
    CONSTRAINT valid_queue_status CHECK (status IN ('queued', 'assigned', 'running', 'complete', 'failed'))
);

CREATE INDEX idx_queue_status ON execution_queue(status);
CREATE INDEX idx_queue_submitted ON execution_queue(queued_at);
CREATE INDEX idx_queue_priority ON execution_queue(priority, queued_at);

-- Test cases for challenges
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    test_number INTEGER NOT NULL,
    description VARCHAR(500),
    
    -- Input
    input_data TEXT,
    input_file_path VARCHAR(500), -- S3 path if large files
    
    -- Expected output
    expected_output TEXT,
    expected_output_file_path VARCHAR(500),
    
    -- Constraints
    time_limit_ms INTEGER DEFAULT 5000,
    memory_limit_mb INTEGER DEFAULT 256,
    
    -- Visibility
    is_hidden BOOLEAN DEFAULT FALSE, -- Hidden test cases for challenges
    is_example BOOLEAN DEFAULT TRUE, -- Example test case for problem statement
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(workspace_id, test_number)
);

CREATE INDEX idx_testcases_workspace ON test_cases(workspace_id);

-- ============================================================================
-- PART 4: COURSES & LEARNING MANAGEMENT
-- ============================================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    cover_image_url TEXT,
    
    -- Course settings
    is_published BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    estimated_hours INTEGER,
    programming_language VARCHAR(100),
    tags VARCHAR(255)[] DEFAULT '{}',
    
    -- Monetization
    price_cents INTEGER DEFAULT 0, -- 0 = free
    stripe_product_id VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    
    CONSTRAINT valid_difficulty CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
);

CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_published ON courses(is_published);

-- Course modules/lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sequence_number INTEGER NOT NULL,
    
    -- Content
    description TEXT,
    content_markdown TEXT, -- Lesson body with embedded videos
    video_url TEXT, -- YouTube, Vimeo, S3-hosted
    video_duration_seconds INTEGER,
    
    -- Attachments
    code_template_id UUID REFERENCES files(id) ON DELETE SET NULL,
    attachment_urls TEXT[],
    
    is_published BOOLEAN DEFAULT FALSE,
    requires_completion BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(course_id, slug)
);

CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_sequence ON lessons(course_id, sequence_number);

-- Coding challenges within lessons
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    
    title VARCHAR(500) NOT NULL,
    problem_statement TEXT, -- Markdown
    sequence_number INTEGER NOT NULL,
    
    -- Difficulty & scoring
    difficulty VARCHAR(50), -- 'easy', 'medium', 'hard'
    max_points INTEGER DEFAULT 100,
    time_limit_seconds INTEGER DEFAULT 30,
    memory_limit_mb INTEGER DEFAULT 256,
    
    -- Solution template
    starter_code TEXT,
    solution_code TEXT, -- Kept private, used for grading
    language VARCHAR(50),
    
    -- Hints & resources
    hints JSONB DEFAULT '[]', -- Array of {hint_text, unlocked_after_attempts}
    editorial_solution TEXT,
    resources JSONB DEFAULT '[]', -- Links to external resources
    
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(lesson_id, sequence_number),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

CREATE INDEX idx_challenges_lesson ON challenges(lesson_id);

-- Student enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Enrollment status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'dropped'
    
    -- Progress
    lessons_completed INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    
    -- Timestamps
    enrolled_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    dropped_at TIMESTAMP,
    
    -- Certificate
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    certificate_issued_at TIMESTAMP,
    
    UNIQUE(course_id, user_id)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Student lesson progress
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Progress state
    is_started BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    is_passed BOOLEAN DEFAULT FALSE,
    
    time_spent_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    bookmarked BOOLEAN DEFAULT FALSE,
    
    UNIQUE(lesson_id, enrollment_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(is_completed);

-- Challenge submissions for course
CREATE TABLE challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Submission details
    submission_number INTEGER NOT NULL,
    code_submitted TEXT NOT NULL,
    language VARCHAR(50),
    
    -- Results
    status VARCHAR(50) NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0,
    
    -- Feedback
    ai_feedback TEXT,
    instructor_feedback TEXT,
    
    submitted_at TIMESTAMP DEFAULT NOW(),
    graded_at TIMESTAMP,
    
    UNIQUE(challenge_id, enrollment_id, submission_number),
    CONSTRAINT valid_status CHECK (status IN ('submitted', 'running', 'passed', 'failed', 'timeout', 'error'))
);

CREATE INDEX idx_challenge_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_enrollment ON challenge_submissions(enrollment_id);

-- ============================================================================
-- PART 5: AI & ANALYTICS
-- ============================================================================

CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    
    interaction_type VARCHAR(50) NOT NULL, -- 'debug_help', 'code_generation', 'explanation', 'optimization'
    
    -- Prompt & response
    user_prompt TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    ai_model VARCHAR(100), -- 'gpt-4o', 'claude-3.5-sonnet', etc.
    tokens_used INTEGER,
    
    -- Context
    code_context TEXT, -- Relevant code snippet from workspace
    error_context TEXT, -- Stack trace or compilation error
    
    -- Feedback
    user_feedback VARCHAR(50), -- 'helpful', 'unhelpful', 'harmful'
    user_rating INTEGER, -- 1-5 stars
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_workspace ON ai_interactions(workspace_id);
CREATE INDEX idx_ai_interactions_type ON ai_interactions(interaction_type);

-- Vector embeddings for RAG (stored in separate vector DB, this is just metadata)
CREATE TABLE code_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INTEGER,
    
    -- Text content (indexed for search)
    code_chunk TEXT NOT NULL,
    chunk_start_line INTEGER,
    chunk_end_line INTEGER,
    
    -- Embedding metadata
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    embedding_dimension INTEGER DEFAULT 1536,
    vector_db_id VARCHAR(500), -- Reference to external vector DB (Weaviate/Pinecone)
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embeddings_file ON code_embeddings(file_id);

-- User analytics & telemetry
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Coding activity
    total_submissions INTEGER DEFAULT 0,
    submissions_today INTEGER DEFAULT 0,
    languages_used VARCHAR(255)[],
    total_code_written_chars BIGINT DEFAULT 0,
    
    -- Performance metrics
    avg_submission_time_ms FLOAT,
    avg_memory_used_mb FLOAT,
    total_runtime_seconds BIGINT DEFAULT 0,
    error_rate FLOAT DEFAULT 0.0, -- Percentage of failed submissions
    
    -- Engagement
    courses_enrolled INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    
    -- Elo rating (for matchmaking)
    elo_rating INTEGER DEFAULT 1200,
    elo_tier VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
    
    -- Last activity
    last_submission_at TIMESTAMP,
    last_code_edit_at TIMESTAMP,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_elo_tier CHECK (elo_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'))
);

CREATE INDEX idx_analytics_user ON user_analytics(user_id);
CREATE INDEX idx_analytics_elo ON user_analytics(elo_rating DESC);

-- Daily activity snapshot (for dashboards)
CREATE TABLE daily_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    
    -- Daily stats
    submissions_count INTEGER DEFAULT 0,
    successful_submissions INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    code_lines_written INTEGER DEFAULT 0,
    total_time_spent_minutes INTEGER DEFAULT 0,
    
    -- Languages used
    languages_used JSONB DEFAULT '{}', -- {python: 5, cpp: 3}
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_daily_activity_user ON daily_activity_logs(user_id);
CREATE INDEX idx_daily_activity_date ON daily_activity_logs(activity_date);

-- ============================================================================
-- PART 6: PAYMENTS & BILLING
-- ============================================================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    payment_type VARCHAR(50) NOT NULL, -- 'stripe_card', 'stripe_bank'
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255),
    
    -- Card details (masked)
    card_brand VARCHAR(50), -- 'visa', 'mastercard', etc.
    card_last_four VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(100) NOT NULL UNIQUE, -- 'starter', 'pro', 'enterprise'
    description TEXT,
    
    -- Pricing
    monthly_price_cents INTEGER,
    yearly_price_cents INTEGER,
    trial_days INTEGER DEFAULT 14,
    
    -- Features & limits
    max_concurrent_executions INTEGER DEFAULT 1,
    max_ai_calls_per_month INTEGER DEFAULT 100,
    max_storage_gb INTEGER DEFAULT 5,
    max_collaborators_per_workspace INTEGER DEFAULT 5,
    
    stripe_product_id VARCHAR(255),
    stripe_monthly_price_id VARCHAR(255),
    stripe_yearly_price_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL, -- 'active', 'past_due', 'canceled', 'unpaid'
    
    billing_cycle VARCHAR(50), -- 'monthly', 'yearly'
    
    -- Dates
    started_at TIMESTAMP DEFAULT NOW(),
    next_billing_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    canceled_at TIMESTAMP,
    
    auto_renew BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing'))
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Invoices & billing history
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    stripe_invoice_id VARCHAR(255) UNIQUE,
    
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    status VARCHAR(50) NOT NULL, -- 'draft', 'open', 'paid', 'uncollectible', 'void'
    
    -- Dates
    issued_at TIMESTAMP DEFAULT NOW(),
    due_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    pdf_url TEXT,
    receipt_url TEXT,
    
    CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void'))
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- PART 7: NOTIFICATIONS & MODERATION
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(100) NOT NULL, 
    -- 'submission_graded', 'collaborator_joined', 'course_published', 'ai_feedback_ready', etc.
    
    title VARCHAR(255),
    message TEXT,
    related_entity_id UUID, -- workspace_id, challenge_id, etc.
    related_entity_type VARCHAR(50), -- 'workspace', 'challenge', 'course'
    
    action_url VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Moderation & reports
CREATE TABLE content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_entity_id UUID NOT NULL, -- workspace_id, submission_id, course_id
    reported_entity_type VARCHAR(50) NOT NULL,
    
    reason VARCHAR(255) NOT NULL, -- 'spam', 'plagiarism', 'inappropriate', 'security_risk'
    description TEXT,
    
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'rejected'
    
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    action_taken VARCHAR(255), -- 'deleted', 'warned_user', 'closed'
    
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    
    CONSTRAINT valid_report_reason CHECK (reason IN ('spam', 'plagiarism', 'inappropriate', 'security_risk', 'other'))
);

CREATE INDEX idx_reports_reported_by ON content_reports(reported_by_id);
CREATE INDEX idx_reports_status ON content_reports(status);

-- ============================================================================
-- PART 8: AUDIT LOG (Compliance & Security)
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, 
    -- 'file_created', 'file_deleted', 'submission_made', 'collaborator_added', 'code_executed'
    
    resource_type VARCHAR(50),
    resource_id UUID,
    
    changes JSONB DEFAULT '{}', -- Before/after values for sensitive operations
    ip_address INET,
    user_agent TEXT,
    
    status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'blocked'
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- PART 9: MATERIALIZED VIEWS (For Performance)
-- ============================================================================

CREATE MATERIALIZED VIEW user_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.avatar_url,
    ua.elo_rating,
    ua.elo_tier,
    ua.total_submissions,
    ua.total_points,
    COUNT(DISTINCT e.id)::INT as courses_completed,
    RANK() OVER (ORDER BY ua.elo_rating DESC) as rank
FROM users u
LEFT JOIN user_analytics ua ON u.id = ua.user_id
LEFT JOIN enrollments e ON u.id = e.user_id AND e.status = 'completed'
WHERE u.status = 'active'
GROUP BY u.id, u.username, u.avatar_url, ua.elo_rating, ua.elo_tier, ua.total_submissions, ua.total_points;

CREATE INDEX idx_leaderboard_elo ON user_leaderboard(elo_rating DESC);

-- ============================================================================
-- PART 10: TRIGGERS (Business Logic)
-- ============================================================================

-- Auto-update workspace timestamp on file change
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workspaces SET updated_at = NOW() WHERE id = NEW.workspace_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workspace_on_file
AFTER INSERT OR UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION update_workspace_timestamp();

-- Increment submission counter
CREATE OR REPLACE FUNCTION increment_submission_counter()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE user_analytics 
        SET total_submissions = total_submissions + 1,
            last_submission_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_submission
AFTER UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION increment_submission_counter();

-- Auto-record audit log on file deletion
CREATE OR REPLACE FUNCTION audit_file_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, action_type, resource_type, resource_id, status, created_at)
    VALUES (CURRENT_USER_ID(), 'file_deleted', 'file', NEW.id, 'success', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 11: ROW-LEVEL SECURITY (Multi-Tenancy)
-- ============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_select_policy ON workspaces
FOR SELECT USING (
    owner_id = CURRENT_USER_ID() 
    OR is_public = TRUE
    OR EXISTS (
        SELECT 1 FROM workspace_collaborators 
        WHERE workspace_id = workspaces.id 
        AND user_id = CURRENT_USER_ID()
    )
);

CREATE POLICY file_select_policy ON files
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = files.workspace_id
        AND (w.owner_id = CURRENT_USER_ID() OR w.is_public = TRUE)
    )
    OR EXISTS (
        SELECT 1 FROM workspace_collaborators wc
        JOIN workspaces w ON w.id = wc.workspace_id
        WHERE w.id = files.workspace_id
        AND wc.user_id = CURRENT_USER_ID()
    )
);

-- ============================================================================
-- PART 12: INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Leaderboard query optimization
CREATE INDEX idx_user_analytics_elo_tier ON user_analytics(elo_tier, elo_rating DESC);

-- Submission analytics
CREATE INDEX idx_submissions_user_language ON submissions(user_id, language);
CREATE INDEX idx_submissions_workspace_status ON submissions(workspace_id, status);

-- Course analytics
CREATE INDEX idx_enrollments_status_course ON enrollments(course_id, status);
CREATE INDEX idx_challenge_submissions_status ON challenge_submissions(status, submitted_at DESC);

-- Real-time sync
CREATE INDEX idx_file_versions_file_created ON file_versions(file_id, created_at DESC);

-- ============================================================================
-- PART 13: SCHEMA METADATA
-- ============================================================================

-- This view helps with introspection
CREATE VIEW schema_tables AS
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Set default search_path
SET search_path TO public;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
