#!/bin/bash

echo "🛡️  InsureCo Claims Submission Platform"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ docker-compose is available"
echo ""

# Stop any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down -v 2>/dev/null

echo ""
echo "🚀 Starting all services..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service health..."
echo ""

services=("postgres:5432" "kafka-stub:6379" "api-gateway:8000" "claims-service:3001" "document-service:8001" "notification-service:8002")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if docker-compose ps | grep -q "$name.*Up"; then
        echo "✅ $name is running"
    else
        echo "⚠️  $name may not be ready yet"
    fi
done

echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "📱 Access the application:"
echo "   Frontend:              http://localhost:3000"
echo "   API Gateway:           http://localhost:8000"
echo "   Claims Service:        http://localhost:3001/health"
echo "   Document Service:      http://localhost:8001/health"
echo "   Notification Service:  http://localhost:8002/health"
echo "   MailHog (Email UI):    http://localhost:8025"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
echo "📖 For more information, see DEPLOYMENT.md"
echo ""

# Made with Bob
