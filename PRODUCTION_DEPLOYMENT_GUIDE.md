# CodeVerse Production Deployment Guide

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Methods](#deployment-methods)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Logging](#monitoring--logging)
8. [Scaling & Performance](#scaling--performance)
9. [Security Hardening](#security-hardening)
10. [Disaster Recovery](#disaster-recovery)
11. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Security scanning completed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Backup procedures in place
- [ ] Monitoring configured
- [ ] Team notified of deployment window
- [ ] Rollback plan documented

---

## Infrastructure Setup

### AWS Deployment (Recommended)

#### 1. Create VPC & Networking

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxx --vpc-id vpc-xxx
```

#### 2. Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier codeverse-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.1 \
  --master-username postgres \
  --master-user-password $(openssl rand -base64 32) \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name default \
  --backup-retention-period 30 \
  --enable-iam-database-authentication \
  --enable-cloudwatch-logs-exports postgresql
```

#### 3. Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id codeverse-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --engine-version 7.0 \
  --num-cache-nodes 1
```

#### 4. Create EKS Cluster

```bash
# Create cluster
eksctl create cluster --name codeverse-prod \
  --version 1.27 \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-max 10 \
  --nodes-min 3

# Update kubeconfig
aws eks update-kubeconfig --name codeverse-prod --region us-east-1
```

### Docker Compose (Development/Small Scale)

```bash
cd codeverse-app
docker-compose up -d
```

---

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE codeverse;
CREATE USER codeverse_user WITH PASSWORD 'secure_password_here';
ALTER ROLE codeverse_user SET client_encoding TO 'utf8mb4';
ALTER ROLE codeverse_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE codeverse_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE codeverse TO codeverse_user;
```

### 2. Run Migrations

```bash
cd backend
npm run migrate

# Or manually:
psql -U postgres -d codeverse -f ../database/schema.sql
```

### 3. Create Backups

```bash
# Create backup
pg_dump -h localhost -U postgres -d codeverse > codeverse_backup_$(date +%Y%m%d).sql

# Configure automated backups
aws rds modify-db-instance \
  --db-instance-identifier codeverse-prod \
  --backup-retention-period 30
```

---

## Environment Configuration

### 1. Create .env.production

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# API Configuration
API_URL=https://api.codeverse.io
FRONTEND_URL=https://codeverse.io

# Database
DB_HOST=codeverse-prod.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=codeverse
DB_USER=codeverse_user
DB_PASSWORD=your_secure_password_here

# Redis
REDIS_HOST=codeverse-redis.xxxxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Authentication
JWT_SECRET=your_very_long_random_secret_key_here_min_32_chars
SESSION_SECRET=another_random_secret_key_here

# OAuth (GitHub)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Integration
OPENAI_API_KEY=sk-your_openai_api_key_here

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=codeverse-files
```

### 2. Store Secrets in Kubernetes

```bash
kubectl create secret generic codeverse-secrets \
  --from-env-file=.env.production \
  -n codeverse
```

### 3. Create ConfigMap

```bash
kubectl create configmap codeverse-config \
  --from-literal=NODE_ENV=production \
  --from-literal=LOG_LEVEL=info \
  -n codeverse
```

---

## Deployment Methods

### Method 1: Kubernetes (Recommended)

```bash
# Build and push images
docker build -t ghcr.io/codeverse/backend:latest -f docker/Dockerfile.backend.prod ./backend
docker build -t ghcr.io/codeverse/frontend:latest -f docker/Dockerfile.frontend.prod ./frontend

docker push ghcr.io/codeverse/backend:latest
docker push ghcr.io/codeverse/frontend:latest

# Deploy to Kubernetes
kubectl apply -f kubernetes/deployment.yaml

# Verify deployment
kubectl rollout status deployment/backend -n codeverse
kubectl rollout status deployment/frontend -n codeverse

# Check pods
kubectl get pods -n codeverse
```

### Method 2: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Build images
docker build -t codeverse-backend:latest -f docker/Dockerfile.backend.prod ./backend
docker build -t codeverse-frontend:latest -f docker/Dockerfile.frontend.prod ./frontend

# Deploy stack
docker stack deploy -c docker-compose.prod.yml codeverse
```

### Method 3: Railway/Heroku

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your_secret
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check backend health
curl https://api.codeverse.io/health

# Check frontend
curl https://codeverse.io

# Check database connection
kubectl exec -it postgres-0 -n codeverse -- psql -U postgres -d codeverse -c "SELECT version();"

# Check Redis
kubectl exec -it redis-xxx -n codeverse -- redis-cli ping
```

### 2. Smoke Tests

```bash
# Test authentication
curl -X POST https://api.codeverse.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test file operations
curl https://api.codeverse.io/api/v1/workspaces \
  -H "Authorization: Bearer your_token"
```

### 3. Database Validation

```bash
# Check migrations
kubectl exec -it postgres-0 -n codeverse -- psql -U postgres -d codeverse -c "\dt"

# Verify data integrity
kubectl exec -it postgres-0 -n codeverse -- psql -U postgres -d codeverse -c "SELECT COUNT(*) FROM users;"
```

---

## Monitoring & Logging

### 1. Set Up Prometheus

```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
  - job_name: 'kubernetes'
    kubernetes_sd_configs:
      - role: pod
```

### 2. Configure Grafana

```bash
# Install Grafana Helm chart
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana -n codeverse

# Access Grafana
kubectl port-forward svc/grafana 3000:80 -n codeverse
```

### 3. Set Up ELK Stack (Optional)

```bash
# Install Elasticsearch
helm install elasticsearch elastic/elasticsearch -n codeverse

# Install Kibana
helm install kibana elastic/kibana -n codeverse

# Configure filebeat in pods
```

### 4. CloudWatch Logs (AWS)

```bash
# Configure logging
aws logs create-log-group --log-group-name /codeverse/backend
aws logs create-log-group --log-group-name /codeverse/frontend
```

---

## Scaling & Performance

### 1. Horizontal Pod Autoscaling

```bash
# Check HPA status
kubectl get hpa -n codeverse

# Manual scaling
kubectl scale deployment backend --replicas=5 -n codeverse
```

### 2. Database Connection Pooling

```typescript
// In backend code
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Caching Strategy

- Use Redis for session management
- Cache frequently accessed data
- Implement cache invalidation

### 4. CDN Setup

```bash
# CloudFront (AWS)
aws cloudfront create-distribution --origin-domain-name codeverse.s3.amazonaws.com
```

---

## Security Hardening

### 1. SSL/TLS Certificates

```bash
# Let's Encrypt with cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@codeverse.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Network Policies

```bash
# Apply NetworkPolicy
kubectl apply -f kubernetes/deployment.yaml # Includes NetworkPolicy
```

### 3. RBAC (Role-Based Access Control)

```bash
# Create service account
kubectl create serviceaccount backend -n codeverse

# Create role
kubectl create role backend-role \
  --verb=get,list,watch \
  --resource=pods \
  -n codeverse

# Bind role
kubectl create rolebinding backend-binding \
  --clusterrole=backend-role \
  --serviceaccount=codeverse:backend \
  -n codeverse
```

### 4. Secrets Management

```bash
# Use HashiCorp Vault or AWS Secrets Manager
aws secretsmanager create-secret \
  --name codeverse/prod/secrets \
  --secret-string file://secrets.json
```

### 5. DDoS Protection

```bash
# AWS Shield Advanced
aws shield-advanced --subscription

# WAF Rules
aws wafv2 create-web-acl --region us-east-1 ...
```

---

## Disaster Recovery

### 1. Backup Strategy

```bash
# Daily automated backups
aws rds modify-db-instance \
  --db-instance-identifier codeverse-prod \
  --backup-retention-period 30 \
  --preferred-backup-window "02:00-03:00"

# RTO: 5 minutes
# RPO: 1 minute (with enhanced monitoring)
```

### 2. Database Recovery

```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier codeverse-restored \
  --db-snapshot-identifier codeverse-prod-snapshot-xxx
```

### 3. Kubernetes Recovery

```bash
# Etcd backup
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  snapshot save backup.db

# Restore
etcdctl snapshot restore backup.db
```

---

## Troubleshooting

### 1. Pod Not Starting

```bash
# Check pod logs
kubectl logs -f deployment/backend -n codeverse

# Describe pod
kubectl describe pod backend-xxx -n codeverse

# Check events
kubectl get events -n codeverse --sort-by='.lastTimestamp'
```

### 2. Database Connection Issues

```bash
# Test connection
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql postgresql://user:pass@postgres:5432/codeverse
```

### 3. High Memory Usage

```bash
# Check resource usage
kubectl top pods -n codeverse

# Increase limits
kubectl set resources deployment backend \
  -n codeverse \
  --limits=memory=1Gi,cpu=1000m
```

### 4. API Rate Limiting

```bash
# Check rate limits
curl -I https://api.codeverse.io/api/v1/workspaces

# Look for X-RateLimit-* headers
```

---

## Rollback Procedure

```bash
# View rollout history
kubectl rollout history deployment/backend -n codeverse

# Rollback to previous version
kubectl rollout undo deployment/backend -n codeverse

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n codeverse

# Verify rollback
kubectl rollout status deployment/backend -n codeverse
```

---

## Maintenance Windows

- **Weekly**: Check logs and metrics
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Full disaster recovery test

---

## Support & Escalation

- **On-call**: DevOps team
- **Critical Issues**: Page on-call engineer
- **Questions**: #codeverse-devops on Slack
- **Documentation**: [Wiki](https://wiki.codeverse.io)

---

## Version & Changelog

- **Version**: 1.0.0
- **Last Updated**: 2024-01-15
- **Maintained By**: DevOps Team
