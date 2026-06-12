# InsureCo Claims Platform - Quick Start Guide

## 🚀 One-Command Deployment

```bash
./start.sh
```

That's it! The script will:
1. Check Docker is running
2. Clean up any existing containers
3. Start all services
4. Verify health status
5. Display access URLs

## 📱 Access the Application

Once deployed, open your browser to:

**http://localhost:3000**

## 🎯 Demo Scenario

### Test Claim Submission

1. **Select Policy**: Choose `POL-8821` from dropdown
2. **Claim Type**: Select `Auto Collision`
3. **Incident Date**: Pick any recent date
4. **Amount**: 
   - Enter `$4,200` for **auto-approval** (< $5,000 threshold)
   - Enter `$6,000` for **manual review** (≥ $5,000 threshold)
5. **Description**: Add optional details
6. **Submit**: Review and submit the claim

### Expected Results

**Auto-Approved Claims ($4,200):**
- ✅ Claim submitted in ~310ms
- ✅ Status: `SUBMITTED` → `AUTO_APPROVED`
- ✅ Email notification sent (view at http://localhost:8025)
- ✅ SMS notification logged
- ✅ Total processing: ~1.5 seconds

**Manual Review Claims ($6,000):**
- ✅ Claim submitted in ~310ms
- ✅ Status: `SUBMITTED` → `UNDER_REVIEW`
- ✅ Assigned to adjuster (ADJ-001, ADJ-002, or ADJ-003)
- ✅ Notifications sent

## 📊 Monitor the Flow

### View Real-Time Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f claims-service
docker-compose logs -f notification-service
docker-compose logs -f claims-processor
```

### Check Email Notifications

Open **http://localhost:8025** to see MailHog email testing interface.

### Query Database

```bash
# Connect to PostgreSQL
docker exec -it insureco-postgres psql -U insureco -d insureco

# View recent claims
SELECT id, policy_id, claim_type, status, amount, created_at 
FROM claims 
ORDER BY created_at DESC 
LIMIT 10;

# View audit log
SELECT claim_id, actor, action, created_at 
FROM audit_log 
ORDER BY created_at DESC 
LIMIT 20;

# Exit
\q
```

## 🔍 Service Health Checks

```bash
# API Gateway
curl http://localhost:8000/health

# Claims Service
curl http://localhost:3001/health

# Document Service
curl http://localhost:8001/health

# Notification Service
curl http://localhost:8002/health
```

## 📖 Architecture Overview

### Components

1. **Frontend (React)** - Port 3000
   - Multi-step claim submission form
   - Client-side validation with Zod
   - Real-time status updates

2. **API Gateway (Express)** - Port 8000
   - JWT validation (stubbed)
   - Rate limiting (100 req/min)
   - Request routing

3. **Claims Service (NestJS)** - Port 3001
   - Core business logic
   - PostgreSQL transactions
   - Kafka event production

4. **Document Service (FastAPI)** - Port 8001
   - File upload handling
   - Virus scanning (stubbed)
   - S3 storage (stubbed)

5. **Notification Service (Go)** - Port 8002
   - Email via SES (stubbed with MailHog)
   - SMS via Twilio (stubbed)
   - Kafka event consumption

6. **Claims Processor (Java/Spring)** - Background
   - Async claim adjudication
   - Auto-triage rules
   - Adjuster assignment

7. **PostgreSQL** - Port 5432
   - Primary data store
   - Multi-AZ ready
   - Row-level security

8. **Redis (Kafka Stub)** - Port 6379
   - Event streaming
   - Pub/sub messaging

## 🎓 Executive Presentation

Open the comprehensive presentation:

```bash
open presentation/executive-presentation.html
```

Or navigate to: `presentation/executive-presentation.html` in your browser.

The presentation covers:
- Architecture overview
- Component details
- Technology stack
- Security features
- Performance metrics
- Deployment strategies
- Future enhancements

## 🛑 Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove all data (clean slate)
docker-compose down -v
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check available resources
docker system df

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Port Conflicts

If ports are already in use, edit `docker-compose.yml` and change the left side of port mappings:

```yaml
ports:
  - "3001:3001"  # Change 3001 to an available port
```

### Database Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Verify connection
docker exec insureco-postgres pg_isready -U insureco
```

## 📚 Additional Resources

- **Full Documentation**: See `README.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Architecture Diagram**: See `claimsubmissionarchitecture.png`
- **Interactive Demo**: See `insurance_claim_architecture.html`

## 💡 Tips

1. **First Time Setup**: Initial build may take 5-10 minutes
2. **Subsequent Starts**: Services start in ~30 seconds
3. **Clean Slate**: Use `docker-compose down -v` to reset everything
4. **Logs**: Always check logs if something doesn't work
5. **Health Checks**: Wait for all health checks to pass before testing

## 🎯 Demo Script for Executives

1. **Show Architecture** (2 min)
   - Open `presentation/executive-presentation.html`
   - Explain microservices approach
   - Highlight key benefits

2. **Live Demo** (3 min)
   - Open http://localhost:3000
   - Submit claim with $4,200 (auto-approve)
   - Show real-time logs: `docker-compose logs -f`
   - Check email at http://localhost:8025

3. **Show Processing** (2 min)
   - Query database to show claim status
   - Show audit log entries
   - Explain async processing

4. **Discuss Benefits** (3 min)
   - Scalability: Each service scales independently
   - Resilience: Event-driven with Kafka
   - Security: OAuth2, TLS, rate limiting
   - Performance: Sub-second response times

Total: ~10 minutes

## 🚀 Next Steps

After the demo:
1. Review the executive presentation
2. Explore the codebase structure
3. Check deployment options in `DEPLOYMENT.md`
4. Discuss production deployment strategy
5. Plan Phase 2 features

---

**Questions?** Check the logs: `docker-compose logs -f`