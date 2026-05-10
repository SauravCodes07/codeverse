# CodeVerse Deployment & Setup Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Sandbox Build](#docker-sandbox-build)
4. [Backend Services Deployment](#backend-services-deployment)
5. [Kubernetes Cluster Setup](#kubernetes-cluster-setup)
6. [Database Migration](#database-migration)
7. [Environment Configuration](#environment-configuration)
8. [Testing & Validation](#testing--validation)
9. [Production Deployment](#production-deployment)
10. [Monitoring & Observability](#monitoring--observability)

---

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 22.04 LTS recommended) or macOS
- **CPU**: 4+ cores
- **RAM**: 16GB minimum
- **Disk**: 100GB free space

### Required Tools
```bash
# Package Manager
sudo apt update && sudo apt install -y build-essential git curl wget

# Docker & Container Runtime
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Kubernetes (k3s for development, EKS/GKE for production)
curl -sfL https://get.k3s.io | sh -

# gVisor Runtime
curl -fsSL https://gvisor.dev/archive/releases/release/latest/x86_64/runsc | \
  sudo install -m755 /dev/stdin /usr/local/bin/runsc

curl -fsSL https://gvisor.dev/archive/releases/release/latest/x86_64/containerd-shim-runsc-v1 | \
  sudo install -m755 /dev/stdin /usr/local/bin/containerd-shim-runsc-v1

# Node.js & npm (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL Client
sudo apt install -y postgresql-client

# Redis CLI
sudo apt install -y redis-tools

# Terraform (optional, for IaC)
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip && sudo mv terraform /usr/local/bin/
```

---

## Local Development Setup

### Step 1: Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/codeverse/codeverse.git
cd codeverse

# Install backend dependencies
npm install
npm install -D @types/node @types/express ts-node typescript

# Install frontend dependencies (React)
cd frontend
npm install
npm install react monaco-editor yjs socket.io-client axios zustand
```

### Step 2: Start PostgreSQL (Docker)

```bash
docker run -d \
  --name codeverse-postgres \
  -e POSTGRES_DB=codeverse \
  -e POSTGRES_USER=codeverse_user \
  -e POSTGRES_PASSWORD=secure_password_123 \
  -p 5432:5432 \
  -v codeverse-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

# Wait for startup
sleep 5

# Verify connection
psql -h localhost -U codeverse_user -d codeverse -c "SELECT version();"
```

### Step 3: Start Redis (Docker)

```bash
docker run -d \
  --name codeverse-redis \
  -p 6379:6379 \
  -v codeverse-redisdata:/data \
  redis:7-alpine \
  redis-server --appendonly yes

# Test connection
redis-cli ping
```

### Step 4: Initialize Database Schema

```bash
# Set environment variables
export DATABASE_URL="postgresql://codeverse_user:secure_password_123@localhost:5432/codeverse"

# Run migrations
psql $DATABASE_URL -f database/schema.sql

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

### Step 5: Configure Environment

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://codeverse_user:secure_password_123@localhost:5432/codeverse

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=codeverse-executions-dev

# Authentication
JWT_SECRET=your_jwt_secret_key_here
OAUTH_GITHUB_ID=your_github_oauth_id
OAUTH_GITHUB_SECRET=your_github_oauth_secret

# gRPC Executor
EXECUTOR_HOST=localhost
EXECUTOR_PORT=50051

# API Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# AI Service
AI_SERVICE_URL=http://localhost:5000
AI_SERVICE_TOKEN=your_ai_service_token
```

### Step 6: Start Backend Server

```bash
# Compile TypeScript
npx tsc

# Start server (with auto-reload)
npm run dev

# Expected output:
# [CodeVerse Antigravity Router] Listening on port 3000
# Supported languages: cpp, c, java, python, javascript, go, rust
```

### Step 7: Start Frontend Development Server

```bash
cd frontend
npm start

# Expected output:
# VITE v4.x.x ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

### Step 8: Test API Connectivity

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"2026-05-08T12:00:00.000Z"}

# Test execution (with valid JWT token)
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "test-workspace",
    "user_id": "test-user",
    "active_file": {
      "name": "hello.py",
      "path": "hello.py",
      "content": "print(\"Hello, CodeVerse!\")",
      "language": "python"
    },
    "code_files": [
      {
        "name": "hello.py",
        "path": "hello.py",
        "content": "print(\"Hello, CodeVerse!\")",
        "language": "python"
      }
    ]
  }'
```

---

## Docker Sandbox Build

### Step 1: Build Base Sandbox Image

```bash
# Navigate to sandbox directory
cd sandbox-runtime

# Build multi-language sandbox
docker build -f Dockerfile.sandbox -t codeverse/sandbox:base .

# Expected: Successfully tagged codeverse/sandbox:base

# Verify image
docker images | grep codeverse/sandbox
```

### Step 2: Build Language-Specific Images

```bash
# Create Dockerfiles for each language
cat > Dockerfile.cpp << 'EOF'
FROM codeverse/sandbox:base
RUN apt-get update && apt-get install -y g++ cmake && rm -rf /var/lib/apt/lists/*
LABEL language=cpp
EOF

cat > Dockerfile.python << 'EOF'
FROM codeverse/sandbox:base
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
LABEL language=python
EOF

# Build
docker build -f Dockerfile.cpp -t codeverse/sandbox:cpp-latest .
docker build -f Dockerfile.python -t codeverse/sandbox:python-latest .
```

### Step 3: Test Sandbox Container

```bash
# Create test code
mkdir -p /tmp/sandbox-test
cat > /tmp/sandbox-test/hello.py << 'EOF'
print("Hello from CodeVerse Sandbox!")
EOF

# Run sandbox
docker run --rm \
  --runtime=runsc \
  -m 256m \
  --cpus=0.5 \
  -v /tmp/sandbox-test:/tmp/code:ro \
  codeverse/sandbox:python-latest \
  python3 /tmp/code/hello.py

# Expected output:
# Hello from CodeVerse Sandbox!
```

### Step 4: Push to Container Registry

```bash
# Login to Docker Hub (or your registry)
docker login

# Tag for push
docker tag codeverse/sandbox:base YOUR_REGISTRY/codeverse/sandbox:base
docker tag codeverse/sandbox:cpp-latest YOUR_REGISTRY/codeverse/sandbox:cpp-latest
docker tag codeverse/sandbox:python-latest YOUR_REGISTRY/codeverse/sandbox:python-latest

# Push
docker push YOUR_REGISTRY/codeverse/sandbox:base
docker push YOUR_REGISTRY/codeverse/sandbox:cpp-latest
docker push YOUR_REGISTRY/codeverse/sandbox:python-latest
```

---

## Backend Services Deployment

### Step 1: Build Backend Docker Image

```bash
# Create backend Dockerfile
cat > Dockerfile.backend << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/antigravity-router.js"]
EOF

# Build
docker build -f Dockerfile.backend -t codeverse/backend:latest .
```

### Step 2: Run Backend Container

```bash
docker run -d \
  --name codeverse-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@postgres-host:5432/codeverse" \
  -e REDIS_HOST=redis-host \
  -e EXECUTOR_HOST=executor-host \
  codeverse/backend:latest
```

---

## Kubernetes Cluster Setup

### Step 1: Create K3s Cluster

```bash
# For development (single node)
curl -sfL https://get.k3s.io | sh -

# Verify
kubectl get nodes
kubectl get pods -A

# For production, use managed Kubernetes:
# AWS EKS, Google GKE, Azure AKS, or self-managed Kubernetes
```

### Step 2: Create Namespaces

```bash
kubectl create namespace codeverse-backend
kubectl create namespace codeverse-sandbox
kubectl create namespace codeverse-monitoring
```

### Step 3: Create Secrets

```bash
# Database credentials
kubectl create secret generic codeverse-db-secret \
  --from-literal=username=codeverse_user \
  --from-literal=password=secure_password_123 \
  -n codeverse-backend

# AWS S3 credentials
kubectl create secret generic codeverse-aws-secret \
  --from-literal=access-key-id=YOUR_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_SECRET_KEY \
  -n codeverse-backend

# JWT secrets
kubectl create secret generic codeverse-jwt-secret \
  --from-literal=jwt-secret=your_jwt_secret_key \
  -n codeverse-backend
```

### Step 4: Deploy PostgreSQL

```bash
# Create ConfigMap for PostgreSQL
kubectl create configmap postgres-config \
  --from-literal=POSTGRES_DB=codeverse \
  -n codeverse-backend

# Deploy via Helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install codeverse-db bitnami/postgresql \
  --set auth.username=codeverse_user \
  --set auth.password=secure_password_123 \
  --set auth.database=codeverse \
  --set persistence.size=20Gi \
  -n codeverse-backend

# Wait for ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n codeverse-backend --timeout=300s
```

### Step 5: Deploy Redis

```bash
helm install codeverse-cache bitnami/redis \
  --set auth.password=redis_password \
  --set replica.replicaCount=3 \
  --set persistence.size=10Gi \
  -n codeverse-backend

# Wait for ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n codeverse-backend --timeout=300s
```

### Step 6: Deploy Backend API

```bash
# Apply backend deployment
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codeverse-backend
  namespace: codeverse-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: codeverse-backend
  template:
    metadata:
      labels:
        app: codeverse-backend
    spec:
      containers:
      - name: backend
        image: codeverse/backend:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: DATABASE_URL
          value: "postgresql://codeverse_user:secure_password_123@codeverse-db-postgresql:5432/codeverse"
        - name: REDIS_HOST
          value: codeverse-cache-redis-master
        - name: EXECUTOR_HOST
          value: sandbox-service.codeverse-sandbox.svc.cluster.local
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: codeverse-backend
  namespace: codeverse-backend
spec:
  selector:
    app: codeverse-backend
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: LoadBalancer
EOF

# Verify deployment
kubectl get pods -n codeverse-backend
kubectl logs -f deployment/codeverse-backend -n codeverse-backend
```

### Step 7: Deploy Sandbox Execution Environment

```bash
# Apply sandbox manifests
kubectl apply -f sandbox-runtime/manifests/sandbox-deployment.yaml

# Verify
kubectl get pods -n codeverse-sandbox
kubectl get hpa -n codeverse-sandbox
```

---

## Database Migration

### Step 1: Run Migrations

```bash
# Using migration tool (e.g., Flyway, Liquibase, or raw SQL)
psql $DATABASE_URL -f database/schema.sql

# Verify all tables
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
```

### Step 2: Create Indexes

```bash
# Indexes are included in schema.sql, but verify:
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE schemaname='public';"
```

### Step 3: Run Data Seeding (Optional)

```bash
# Seed initial data (users, courses, etc.)
psql $DATABASE_URL -f database/seeds.sql
```

---

## Environment Configuration

### Template: .env.production

```env
# Database
DATABASE_URL=postgresql://codeverse_user:secure_password_123@codeverse-db.codeverse-backend.svc.cluster.local:5432/codeverse
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=30000

# Redis
REDIS_HOST=codeverse-cache-redis-master.codeverse-backend.svc.cluster.local
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0

# AWS S3
AWS_ACCESS_KEY_ID=your_production_access_key
AWS_SECRET_ACCESS_KEY=your_production_secret_key
AWS_REGION=us-east-1
S3_BUCKET=codeverse-executions-prod

# Executor Service
EXECUTOR_HOST=sandbox-service.codeverse-sandbox.svc.cluster.local
EXECUTOR_PORT=50051

# API Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
API_BASE_URL=https://api.codeverse.io

# Authentication
JWT_SECRET=your_long_random_jwt_secret_key_for_production
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# OAuth Providers
OAUTH_GITHUB_ID=your_github_app_id
OAUTH_GITHUB_SECRET=your_github_app_secret
OAUTH_GITHUB_CALLBACK_URL=https://api.codeverse.io/auth/github/callback

OAUTH_GOOGLE_ID=your_google_oauth_id
OAUTH_GOOGLE_SECRET=your_google_oauth_secret
OAUTH_GOOGLE_CALLBACK_URL=https://api.codeverse.io/auth/google/callback

# AI Service
AI_SERVICE_URL=https://ai-service.codeverse.io
AI_SERVICE_TOKEN=your_ai_service_token
AI_MODEL=gpt-4o

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Monitoring & Observability
DATADOG_API_KEY=your_datadog_api_key
SENTRY_DSN=your_sentry_dsn
LOG_AGGREGATION_URL=https://logs.codeverse.io

# Rate Limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

---

## Testing & Validation

### Unit Tests

```bash
npm test

# With coverage
npm run test:coverage
```

### Integration Tests

```bash
# Test against local environment
npm run test:integration

# Test against staging
NODE_ENV=staging npm run test:integration
```

### End-to-End Tests

```bash
# Cypress E2E tests
cd frontend
npm run test:e2e
```

### Load Testing

```bash
# Using k6
npm install k6 -D

# Run load test
k6 run tests/load-test.js
```

---

## Production Deployment

### Step 1: Build & Push Images

```bash
# Build all images
docker build -f Dockerfile.backend -t your-registry/codeverse/backend:v1.0.0 .
docker build -f sandbox-runtime/Dockerfile.sandbox -t your-registry/codeverse/sandbox:v1.0.0 .

# Push to registry
docker push your-registry/codeverse/backend:v1.0.0
docker push your-registry/codeverse/sandbox:v1.0.0
```

### Step 2: Deploy to Production Kubernetes

```bash
# Update image references in manifests
sed -i 's|codeverse/backend:latest|your-registry/codeverse/backend:v1.0.0|g' k8s/deployment.yaml

# Deploy
kubectl apply -f k8s/

# Verify rollout
kubectl rollout status deployment/codeverse-backend -n codeverse-backend
```

### Step 3: Configure CDN & Load Balancing

```bash
# CloudFlare / AWS CloudFront for static assets
# AWS ALB / GCP LB for API traffic
# Configure SSL/TLS certificates
```

---

## Monitoring & Observability

### Prometheus & Grafana

```bash
# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n codeverse-monitoring

# Install Grafana
kubectl port-forward -n codeverse-monitoring svc/prometheus-grafana 3000:80

# Access: http://localhost:3000 (admin/prom-operator)
```

### Jaeger Distributed Tracing

```bash
helm install jaeger jaegertracing/jaeger -n codeverse-monitoring

kubectl port-forward -n codeverse-monitoring svc/jaeger-query 16686:16686

# Access: http://localhost:16686
```

### CloudWatch / Datadog

```bash
# Configure log forwarding
export DATADOG_API_KEY=your_key
export DATADOG_SITE=datadoghq.com

helm install datadog datadog/datadog \
  --set datadog.apiKey=$DATADOG_API_KEY \
  --set datadog.site=$DATADOG_SITE \
  -n codeverse-monitoring
```

---

## Troubleshooting

### Common Issues

1. **Executor Timeout**
   ```bash
   # Check executor logs
   kubectl logs -f deployment/sandbox-pool -n codeverse-sandbox
   
   # Increase timeout in configuration
   EXECUTION_TIMEOUT_SECONDS=60
   ```

2. **Out of Memory Errors**
   ```bash
   # Check pod limits
   kubectl describe pod <pod-name> -n codeverse-sandbox
   
   # Increase memory limit
   # Edit deployment and update resources.limits.memory
   ```

3. **Database Connection Issues**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1"
   
   # Check pool status
   kubectl logs -f deployment/codeverse-backend -n codeverse-backend | grep "pool"
   ```

---

This completes the comprehensive CodeVerse deployment guide. For production use, ensure all security best practices are followed, including secret management, network policies, and RBAC configuration.
