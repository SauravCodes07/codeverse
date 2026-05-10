-- CodeVerse Database Schema
-- PostgreSQL 16+

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE workspace_type AS ENUM ('personal', 'team', 'classroom');
CREATE TYPE submission_status AS ENUM ('pending', 'running', 'completed', 'failed', 'timeout');
CREATE TYPE challenge_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped', 'suspended');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
  password_hash VARCHAR(255),
  verified_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  workspace_type workspace_type DEFAULT 'personal',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE UNIQUE INDEX idx_workspaces_owner_slug ON workspaces(owner_id, slug) WHERE deleted_at IS NULL;

-- ============================================================================
-- WORKSPACE COLLABORATORS TABLE
-- ============================================================================

CREATE TABLE workspace_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspace_collaborators_workspace_id ON workspace_collaborators(workspace_id);
CREATE INDEX idx_workspace_collaborators_user_id ON workspace_collaborators(user_id);
CREATE UNIQUE INDEX idx_workspace_collaborators_unique ON workspace_collaborators(workspace_id, user_id);

-- ============================================================================
-- FILES TABLE
-- ============================================================================

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES files(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  language VARCHAR(50),
  size_bytes BIGINT DEFAULT 0,
  content_hash VARCHAR(64),
  is_binary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_files_workspace_id ON files(workspace_id);
CREATE INDEX idx_files_path ON files(workspace_id, path);
CREATE UNIQUE INDEX idx_files_unique_path ON files(workspace_id, path) WHERE deleted_at IS NULL;

-- ============================================================================
-- FILE VERSIONS TABLE
-- ============================================================================

CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_hash VARCHAR(64),
  size_bytes BIGINT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  commit_message TEXT
);

CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
CREATE UNIQUE INDEX idx_file_versions_unique ON file_versions(file_id, version_number);

-- ============================================================================
-- SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID,
  language VARCHAR(50) NOT NULL,
  entry_point VARCHAR(255),
  status submission_status DEFAULT 'pending',
  stdout_output TEXT,
  stderr_output TEXT,
  compiler_output TEXT,
  exit_code INTEGER,
  execution_time_ms INTEGER,
  cpu_time_ms INTEGER,
  memory_used_mb INTEGER,
  peak_memory_mb INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_submissions_workspace_id ON submissions(workspace_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- ============================================================================
-- TEST CASES TABLE
-- ============================================================================

CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  title VARCHAR(255),
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  timeout_seconds INTEGER DEFAULT 5,
  memory_limit_mb INTEGER DEFAULT 256,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_cases_challenge_id ON test_cases(challenge_id);

-- ============================================================================
-- CHALLENGES TABLE
-- ============================================================================

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty challenge_difficulty DEFAULT 'medium',
  points INTEGER DEFAULT 0,
  time_limit_seconds INTEGER DEFAULT 10,
  memory_limit_mb INTEGER DEFAULT 256,
  template_code TEXT,
  languages VARCHAR(50)[] DEFAULT ARRAY['python', 'javascript', 'cpp', 'java'],
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_challenges_course_id ON challenges(course_id);
CREATE INDEX idx_challenges_slug ON challenges(slug);

-- ============================================================================
-- COURSES TABLE
-- ============================================================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);

-- ============================================================================
-- LESSONS TABLE
-- ============================================================================

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  order_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status enrollment_status DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE UNIQUE INDEX idx_enrollments_unique ON enrollments(course_id, user_id);

-- ============================================================================
-- EXECUTION QUEUE TABLE
-- ============================================================================

CREATE TABLE execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_executor VARCHAR(255),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  queued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_execution_queue_status ON execution_queue(status);
CREATE INDEX idx_execution_queue_queued_at ON execution_queue(queued_at);

-- ============================================================================
-- AI INTERACTIONS TABLE
-- ============================================================================

CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  submission_id UUID REFERENCES submissions(id),
  prompt TEXT NOT NULL,
  response TEXT,
  model VARCHAR(100) DEFAULT 'gpt-4',
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);

-- ============================================================================
-- USER ANALYTICS TABLE
-- ============================================================================

CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  files_created INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  codes_executed INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  total_execution_time_ms BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_date ON user_analytics(date);
CREATE UNIQUE INDEX idx_user_analytics_unique ON user_analytics(user_id, date);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  workspace_id UUID REFERENCES workspaces(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================

CREATE MATERIALIZED VIEW user_leaderboard AS
SELECT 
  u.id,
  u.username,
  u.avatar_url,
  COUNT(DISTINCT c.id) as challenges_completed,
  SUM(c.points) as total_points,
  COUNT(DISTINCT e.course_id) as courses_enrolled,
  ROW_NUMBER() OVER (ORDER BY SUM(c.points) DESC) as rank
FROM users u
LEFT JOIN submissions s ON u.id = s.user_id AND s.status = 'completed'
LEFT JOIN challenges c ON s.challenge_id = c.id
LEFT JOIN enrollments e ON u.id = e.user_id AND e.status = 'completed'
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.avatar_url
ORDER BY total_points DESC;

CREATE INDEX idx_user_leaderboard_rank ON user_leaderboard(rank);

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own workspaces
CREATE POLICY workspace_owner_policy ON workspaces
  USING (owner_id = current_user_id())
  WITH CHECK (owner_id = current_user_id());

-- Users can see workspaces they collaborate on
CREATE POLICY workspace_collaborator_policy ON workspaces
  USING (id IN (
    SELECT workspace_id FROM workspace_collaborators 
    WHERE user_id = current_user_id()
  ));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER users_update_trigger BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workspaces_update_trigger BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER files_update_trigger BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER courses_update_trigger BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER lessons_update_trigger BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER challenges_update_trigger BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to log audit trail
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (action, entity_type, entity_id, changes, created_at)
  VALUES (TG_ARGV[0], TG_TABLE_NAME, NEW.id, row_to_json(NEW), CURRENT_TIMESTAMP);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to critical tables
CREATE TRIGGER audit_submissions AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('SUBMISSION_UPDATE');

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Schedule leaderboard refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-leaderboard', '0 * * * *', 'SELECT refresh_leaderboard()');

-- ============================================================================
-- GRANTS (if using roles)
-- ============================================================================

-- GRANT ALL ON ALL TABLES IN SCHEMA public TO codeverse_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO codeverse_user;
