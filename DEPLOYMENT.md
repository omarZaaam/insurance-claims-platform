# InsureCo Claims Platform - Deployment Guide

## Quick Start (Local Development)

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Minimum 8GB RAM available
- Ports available: 3000, 5432, 6379, 8000, 8001, 8002, 8025

### Step 1: Start All Services

```bash
# From the project root directory
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis (Kafka stub) (port 6379)
- API Gateway (port 8000)
- Claims Service (port 3001)
- Document Service (port 8001)
- Notification Service (port 8002)
- Claims Processor (background)
- Frontend (port 3000)
- MailHog (email testing UI on port 8025)

### Step 2: Wait for Services to be Ready

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f
```

Wait until you see:
- ✅ Database connection pool initialized
- ✅ Connected to Kafka stub (Redis)
- 🚀 Claims Service running on port 3001
- 🚀 API Gateway running on port 8000
- 🚀 Notification Service running on port 8002

### Step 3: Access the Application

Open your browser to: **http://localhost:3000**

### Step 4: Submit a Test Claim

1. Select policy: **POL-8821**
2. Choose claim type: **Auto Collision**
3. Set incident date: Any recent date
4. Enter amount:
   - **$4,200** (will be auto-approved)
   - **$6,000** (will require manual review)
5. Add description (optional)
6. Review and submit

### Step 5: Monitor Processing

```bash
# Watch real-time logs
docker-compose logs -f claims-service notification-service claims-processor

# Check email notifications
# Open http://localhost:8025 to see MailHog UI
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Claims submission portal |
| API Gateway | http://localhost:8000 | API entry point |
| Claims Service | http://localhost:3001 | Core claim processing |
| Document Service | http://localhost:8001 | File handling |
| Notification Service | http://localhost:8002 | Email/SMS dispatch |
| MailHog UI | http://localhost:8025 | Email testing interface |
| PostgreSQL | localhost:5432 | Database (user: insureco, pass: insureco123) |

## Testing the Flow

### Test Case 1: Auto-Approved Claim

```bash
curl -X POST http://localhost:8000/api/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{
    "policyId": "POL-8821",
    "claimType": "AUTO_COLLISION",
    "amount": 4200.00,
    "incidentDate": "2026-06-10",
    "description": "Minor collision at intersection"
  }'
```

Expected response:
```json
{
  "claimId": "uuid-here",
  "status": "SUBMITTED",
  "ref": "INS-2026-xxxxx",
  "message": "Claim submitted successfully"
}
```

### Test Case 2: Manual Review Claim

```bash
curl -X POST http://localhost:8000/api/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{
    "policyId": "POL-8822",
    "claimType": "HOME_PROPERTY",
    "amount": 15000.00,
    "incidentDate": "2026-06-09",
    "description": "Water damage from burst pipe"
  }'
```

This will be assigned to an adjuster for manual review.

## Database Access

```bash
# Connect to PostgreSQL
docker exec -it insureco-postgres psql -U insureco -d insureco

# View claims
SELECT * FROM claims ORDER BY created_at DESC LIMIT 10;

# View documents
SELECT * FROM documents;

# View audit log
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;
```

## Troubleshooting

### Services Not Starting

```bash
# Check Docker resources
docker system df

# Restart services
docker-compose down
docker-compose up -d

# Rebuild if needed
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify database is ready
docker exec insureco-postgres pg_isready -U insureco
```

### Port Conflicts

If ports are already in use, edit `docker-compose.yml` to change port mappings:

```yaml
ports:
  - "3001:3001"  # Change left side to available port
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Production Deployment

### AWS Deployment

1. **ECS/Fargate**: Deploy containers to AWS ECS
2. **RDS**: Use managed PostgreSQL (Multi-AZ)
3. **MSK**: Use managed Kafka service
4. **S3**: Configure real S3 bucket for documents
5. **Cognito**: Set up real OAuth2 authentication
6. **CloudFront**: Configure CDN for frontend
7. **ALB**: Application Load Balancer for API Gateway

### Kubernetes Deployment

```bash
# Build and push images
docker build -t your-registry/claims-service:latest ./services/claims-service
docker push your-registry/claims-service:latest

# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods
kubectl get services
```

### Environment Variables

Set these in production:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/insureco

# Kafka
KAFKA_BROKER=your-kafka-broker:9092

# AWS Services
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
SES_REGION=us-east-1

# Authentication
JWT_SECRET=your-secure-secret-key
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id

# Monitoring
CLOUDWATCH_LOG_GROUP=/aws/ecs/insureco
```

## Monitoring

### Health Checks

```bash
# Check all services
curl http://localhost:8000/health
curl http://localhost:3001/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### Logs

```bash
# View specific service logs
docker-compose logs -f claims-service

# View all logs
docker-compose logs -f

# Export logs
docker-compose logs > logs.txt
```

## Performance Tuning

### Database

```sql
-- Add indexes for common queries
CREATE INDEX idx_claims_status_created ON claims(status, created_at DESC);
CREATE INDEX idx_claims_policy_status ON claims(policy_id, status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM claims WHERE status = 'SUBMITTED';
```

### Kafka

- Increase partitions for higher throughput
- Adjust replication factor for durability
- Configure consumer group settings

### Caching

- Add Redis cache for frequently accessed data
- Implement CDN caching for static assets
- Use HTTP caching headers

## Security Checklist

- [ ] Change default database passwords
- [ ] Configure real JWT secrets
- [ ] Enable TLS/SSL certificates
- [ ] Set up WAF rules
- [ ] Configure VPC and security groups
- [ ] Enable CloudWatch alarms
- [ ] Set up backup and disaster recovery
- [ ] Implement secrets management (AWS Secrets Manager)
- [ ] Enable audit logging
- [ ] Configure rate limiting

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review architecture: Open `presentation/executive-presentation.html`
- Database schema: See `database/init.sql`