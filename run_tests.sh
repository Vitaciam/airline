#!/bin/bash

# Script to run tests for all services

set -e

echo "Running tests for all services..."

services=("auth-service" "booking-service" "baggage-service" "admin-service" "notification-service" "payment-service")

for service in "${services[@]}"; do
    echo ""
    echo "=========================================="
    echo "Testing $service..."
    echo "=========================================="
    cd "$service"
    
    if [ -d "tests" ]; then
        python -m pytest tests/ -v --cov=src --cov-report=term
    else
        echo "No tests directory found for $service"
    fi
    
    cd ..
done

echo ""
echo "=========================================="
echo "All tests completed!"
echo "=========================================="

