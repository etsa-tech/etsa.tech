---
title: "Docker Fundamentals: Containerizing Your Applications"
date: "2023-09-25"
excerpt: "Master the basics of Docker containerization, from creating your first container to building production-ready images and managing multi-container applications."
tags: ["Docker", "Containers", "DevOps", "Microservices", "Application Deployment"]
author: "ETSA"
speakerName: "David Kim"
speakerTitle: "Platform Engineer"
speakerCompany: "ContainerCorp"
speakerBio: "David is a platform engineer with 5+ years of experience in containerization and orchestration. He's helped organizations migrate from monolithic to containerized architectures and is passionate about developer productivity."
speakerLinkedIn: "https://linkedin.com/in/david-kim-platform"
speakerGitHub: "https://github.com/davidkim"
presentationTitle: "Docker Fundamentals: Containerizing Your Applications"
presentationDescription: "Learn the fundamentals of Docker and how to containerize applications effectively"
presentationSlides: "https://slides.example.com/docker-fundamentals"
presentationVideo: "https://youtube.com/watch?v=docker-fundamentals"
eventDate: "2023-09-25"
eventLocation: "Knoxville Entrepreneur Center"
featured: true
published: true
---

# Docker Fundamentals: Containerizing Your Applications

Containerization has revolutionized how we develop, deploy, and manage applications. In this session, we explored Docker fundamentals and learned how to effectively containerize applications for modern development workflows.

## What is Docker?

Docker is a platform that uses containerization technology to package applications and their dependencies into lightweight, portable containers that can run consistently across different environments.

### Key Concepts

- **Container**: A lightweight, standalone package that includes everything needed to run an application
- **Image**: A read-only template used to create containers
- **Dockerfile**: A text file with instructions to build a Docker image
- **Registry**: A service for storing and distributing Docker images

### Benefits of Containerization

- **Consistency**: "It works on my machine" becomes "It works everywhere"
- **Isolation**: Applications run in isolated environments
- **Portability**: Containers run on any system that supports Docker
- **Efficiency**: Lightweight compared to virtual machines
- **Scalability**: Easy to scale applications horizontally

## Docker Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Docker CLI    │    │  Docker Daemon  │    │  Docker Registry│
│                 │    │                 │    │                 │
│ docker build    │───▶│ Container       │◀───│ Docker Hub      │
│ docker run      │    │ Management      │    │ Private Registry│
│ docker push     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Containers    │
                    │                 │
                    │ ┌─────┐ ┌─────┐ │
                    │ │App 1│ │App 2│ │
                    │ └─────┘ └─────┘ │
                    └─────────────────┘
```

## Getting Started with Docker

### Installation

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker run hello-world
```

### Basic Commands

```bash
# Images
docker images                    # List images
docker pull nginx               # Download image
docker rmi nginx               # Remove image
docker build -t myapp .        # Build image

# Containers
docker ps                      # List running containers
docker ps -a                   # List all containers
docker run nginx              # Run container
docker stop container_id      # Stop container
docker rm container_id        # Remove container
docker logs container_id      # View logs

# System
docker system df              # Show disk usage
docker system prune           # Clean up unused resources
```

## Creating Your First Dockerfile

### Simple Web Application

```dockerfile
# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Multi-stage Build

```dockerfile
# Multi-stage Dockerfile for Go application
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy binary from builder stage
COPY --from=builder /app/main .

# Create non-root user
RUN adduser -D -s /bin/sh appuser
USER appuser

EXPOSE 8080
CMD ["./main"]
```

## Docker Best Practices

### 1. Optimize Image Size

```dockerfile
# Use specific tags, not 'latest'
FROM node:18.17.0-alpine

# Combine RUN commands to reduce layers
RUN apk update && \
    apk add --no-cache git && \
    rm -rf /var/cache/apk/*

# Use .dockerignore
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
```

### 2. Security Best Practices

```dockerfile
# Don't run as root
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Use specific versions
FROM ubuntu:22.04

# Scan for vulnerabilities
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl=7.81.0-1ubuntu1.4 && \
    rm -rf /var/lib/apt/lists/*

# Don't include secrets in images
# Use build args or mount secrets
ARG API_KEY
ENV API_KEY=$API_KEY
```

### 3. Layer Optimization

```dockerfile
# Order layers by frequency of change
FROM python:3.11-slim

# Install system dependencies (changes rarely)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (changes occasionally)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (changes frequently)
COPY . .

CMD ["python", "app.py"]
```

## Working with Containers

### Running Containers

```bash
# Basic run
docker run nginx

# Run in background
docker run -d nginx

# Port mapping
docker run -p 8080:80 nginx

# Environment variables
docker run -e NODE_ENV=production myapp

# Volume mounting
docker run -v /host/path:/container/path myapp

# Complete example
docker run -d \
  --name myapp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -v /var/log/myapp:/app/logs \
  --restart unless-stopped \
  myapp:latest
```

### Container Networking

```bash
# Create custom network
docker network create mynetwork

# Run containers on custom network
docker run -d --name database --network mynetwork postgres
docker run -d --name webapp --network mynetwork -p 3000:3000 myapp

# List networks
docker network ls

# Inspect network
docker network inspect mynetwork
```

### Data Management

```bash
# Named volumes
docker volume create mydata
docker run -v mydata:/data myapp

# Bind mounts
docker run -v /host/data:/container/data myapp

# Temporary filesystems
docker run --tmpfs /tmp myapp

# List volumes
docker volume ls

# Inspect volume
docker volume inspect mydata
```

## Docker Compose

### Basic Compose File

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### Advanced Compose Features

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.prod
      args:
        - NODE_ENV=production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  postgres_data:

networks:
  default:
    driver: bridge
```

### Compose Commands

```bash
# Start services
docker-compose up -d

# Scale services
docker-compose up -d --scale web=3

# View logs
docker-compose logs -f web

# Execute commands
docker-compose exec web bash

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

## Real-World Examples

### Python Flask Application

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

### Java Spring Boot Application

```dockerfile
FROM openjdk:17-jdk-slim AS builder

WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

FROM openjdk:17-jre-slim

RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring:spring

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app.jar"]
```

## Monitoring and Debugging

### Container Logs

```bash
# View logs
docker logs container_name

# Follow logs
docker logs -f container_name

# Tail logs
docker logs --tail 100 container_name

# Logs with timestamps
docker logs -t container_name
```

### Container Inspection

```bash
# Inspect container
docker inspect container_name

# Container stats
docker stats

# Process list
docker exec container_name ps aux

# Execute shell
docker exec -it container_name /bin/bash
```

### Resource Monitoring

```bash
# System resource usage
docker system df

# Container resource usage
docker stats --no-stream

# Detailed container info
docker inspect container_name | jq '.[0].State'
```

## Production Considerations

### 1. Image Registry

```bash
# Tag image for registry
docker tag myapp:latest registry.company.com/myapp:v1.0.0

# Push to registry
docker push registry.company.com/myapp:v1.0.0

# Pull from registry
docker pull registry.company.com/myapp:v1.0.0
```

### 2. Container Orchestration

```yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:v1.0.0
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 3. Security Scanning

```bash
# Scan image for vulnerabilities
docker scan myapp:latest

# Use security tools
trivy image myapp:latest
clair-scanner myapp:latest
```

## Troubleshooting Common Issues

### Build Issues

```bash
# Build with no cache
docker build --no-cache -t myapp .

# Build with build args
docker build --build-arg NODE_ENV=production -t myapp .

# Debug build
docker build --progress=plain -t myapp .
```

### Runtime Issues

```bash
# Check container status
docker ps -a

# Inspect container configuration
docker inspect container_name

# Check resource usage
docker stats container_name

# Access container filesystem
docker exec -it container_name /bin/sh
```

## Conclusion

Docker containerization provides a powerful foundation for modern application deployment. Key takeaways:

1. **Start simple**: Begin with basic Dockerfiles and gradually optimize
2. **Follow best practices**: Security, layer optimization, and proper user management
3. **Use multi-stage builds**: Reduce image size and improve security
4. **Leverage Docker Compose**: Simplify multi-container applications
5. **Monitor and debug**: Use proper logging and monitoring tools
6. **Plan for production**: Consider orchestration, security, and scalability

Remember: Containerization is not just about packaging applications—it's about creating consistent, reliable, and scalable deployment pipelines.

---

*This presentation was delivered at the ETSA September 2023 meetup. Complete Dockerfile examples and compose configurations are available in our [GitHub repository](https://github.com/etsa-tech/docker-examples).*
