# InsureCo Claim Submission Platform

A comprehensive insurance claim submission system demonstrating modern microservices architecture.

## Architecture Overview

This platform implements a full-stack claim submission system with:

- **Presentation Layer**: React + TypeScript SPA
- **API Gateway**: Kong/AWS API Gateway stub
- **Microservices**: Claims Service (NestJS), Document Service (FastAPI), Notification Service (Go)
- **Data Layer**: PostgreSQL, S3 (stubbed), Kafka (stubbed)
- **Processing**: Claims Processor (Java/Spring Kafka)

## Components

### Frontend
- **Claims Portal**: React 18 + TypeScript SPA with multi-step form

### Backend Services
- **API Gateway**: TLS termination, JWT validation, rate limiting
- **Claims Service**: Core orchestrator (Node.js/NestJS)
- **Document Service**: File handling with virus scanning (Python/FastAPI)
- **Notification Service**: Email/SMS dispatch (Go)

### Data & Messaging
- **PostgreSQL**: Primary data store (RDS Multi-AZ)
- **S3**: Document storage (stubbed)
- **Kafka**: Event streaming (MSK stubbed)
- **Claims Processor**: Async adjudication worker (Java/Spring)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Go 1.21+
- Java 17+
- PostgreSQL 15+

### Local Deployment

```bash
# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8000
# Claims Service: http://localhost:3001
# Document Service: http://localhost:8001
# Notification Service: http://localhost:8002
```

## Architecture Benefits

1. **Scalability**: Microservices can scale independently
2. **Resilience**: Event-driven architecture with Kafka ensures reliability
3. **Security**: OAuth2/JWT authentication, TLS encryption
4. **Performance**: CDN for static assets, async processing
5. **Maintainability**: Clear separation of concerns, well-defined APIs

## Demo Flow

1. Policyholder submits claim through React portal
2. API Gateway validates JWT and routes request
3. Claims Service persists to PostgreSQL
4. Kafka event triggers async processing
5. Claims Processor auto-approves or assigns adjuster
6. Notification Service sends email/SMS confirmation

## Project Structure

```
.
├── frontend/              # React + TypeScript SPA
├── services/
│   ├── api-gateway/      # Kong/API Gateway stub
│   ├── claims-service/   # NestJS microservice
│   ├── document-service/ # FastAPI microservice
│   ├── notification-service/ # Go microservice
│   └── claims-processor/ # Java/Spring Kafka consumer
├── database/             # PostgreSQL schemas
├── docker-compose.yml    # Local deployment
└── presentation/         # Executive presentation
```

## License

MIT