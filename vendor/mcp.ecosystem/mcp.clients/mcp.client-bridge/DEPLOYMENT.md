# MCP Client Bridge - Deployment and Monitoring Infrastructure

This document describes the deployment and monitoring infrastructure for the MCP Client Bridge application.

## Overview

The MCP Client Bridge is deployed using Docker containers orchestrated by Kubernetes. The infrastructure includes:

- Docker containerization for consistent deployment
- Kubernetes manifests for orchestration
- CI/CD pipeline for automated deployment
- Prometheus and Grafana for monitoring and alerting
- Helm chart for simplified deployment

## Directory Structure

```
mcp.client-bridge/
├── Dockerfile                 # Docker container configuration
├── .dockerignore              # Files to exclude from Docker build
├── healthcheck.js             # Docker health check script
├── k8s/                       # Kubernetes manifests
│   ├── deployment.yaml        # Application deployment
│   ├── service.yaml           # Service definition
│   ├── ingress.yaml           # Ingress configuration
│   ├── pvc.yaml               # Persistent volume claims
│   ├── secrets.yaml           # Secret template
│   ├── namespace.yaml         # Namespace definition
│   └── monitoring.yaml        # Prometheus monitoring configuration
├── helm/                      # Helm chart
│   ├── Chart.yaml             # Chart metadata
│   ├── values.yaml            # Default values
│   ├── templates/             # Helm templates
│   └── _helpers.tpl           # Template helpers
├── monitoring/                # Monitoring configuration
│   ├── prometheus.yml         # Prometheus configuration
│   ├── alert_rules.yml        # Alert rules
│   └── grafana-dashboard.json # Grafana dashboard
└── .github/workflows/         # CI/CD pipeline
    └── ci-cd.yml              # GitHub Actions workflow
```

## Docker Configuration

The application is containerized using Docker with the following features:

- Multi-stage build for optimized image size
- Non-root user for security
- Health check endpoint
- Proper resource limits

## Kubernetes Deployment

The application is deployed to Kubernetes with:

- Multiple replicas for high availability
- Resource requests and limits
- Liveness and readiness probes
- Persistent storage for data and logs
- Security context for non-root execution

## CI/CD Pipeline

The CI/CD pipeline includes:

- Automated testing on pull requests
- Docker image building and publishing
- Staging and production deployments
- Security scanning
- Automated rollbacks on failure

## Monitoring and Alerting

The application is monitored using:

- Prometheus for metric collection
- Grafana for visualization
- Predefined alert rules
- Health check endpoints
- Custom application metrics

### Metrics Collected

- HTTP request rate and duration
- Error rates
- Resource utilization
- Application health status
- Custom business metrics

### Alert Rules

- Application down
- High error rate
- High response time
- High CPU/memory usage
- Custom threshold violations

## Deployment Steps

### Prerequisites

1. Kubernetes cluster with kubectl configured
2. Docker registry for image storage
3. Helm 3.x installed

### Quick Deployment

1. Build and push Docker image:
   ```bash
   docker build -t <registry>/mcp-client-bridge:<tag> .
   docker push <registry>/mcp-client-bridge:<tag>
   ```

2. Create secrets:
   ```bash
   kubectl create secret generic mcp-client-bridge-secrets \
     --from-literal=JWT_SECRET=your_secret \
     --from-literal=API_KEY=your_api_key
   ```

3. Deploy using Helm:
   ```bash
   cd helm
   helm install mcp-client-bridge .
   ```

### Manual Deployment

1. Apply Kubernetes manifests:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/pvc.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl apply -f k8s/monitoring.yaml
   ```

## Configuration

### Environment Variables

The application supports the following environment variables:

- `PORT`: Application port (default: 3000)
- `NODE_ENV`: Environment (default: development)
- `LOG_LEVEL`: Logging level (default: info)
- `MCP_DEFAULT_TIMEOUT`: Default timeout for MCP requests
- `MCP_MAX_RETRIES`: Maximum retry attempts
- `STORAGE_PATH`: Path for persistent storage
- `CACHE_TTL`: Cache time-to-live in seconds

### Secrets

Sensitive information should be stored in Kubernetes secrets:

- `JWT_SECRET`: Secret for JWT token signing
- `API_KEY`: API key for authentication
- `DATABASE_URL`: Database connection string
- `MCP_SERVERS`: JSON array of MCP server configurations

## Security Considerations

- Run as non-root user in containers
- Use least-privilege principle for Kubernetes RBAC
- Enable security contexts and pod security policies
- Use TLS for all external communication
- Regular security scanning of dependencies
- Proper network policies and firewall rules

## Scaling

The application supports horizontal scaling through:

- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes Cluster Autoscaler
- Manual replica count adjustment

## Backup and Recovery

- Persistent volumes for data persistence
- Regular backup of persistent volumes
- Disaster recovery procedures
- Configuration as code for reproducible deployments

## Troubleshooting

### Common Issues

1. **Application not starting**: Check logs with `kubectl logs <pod-name>`
2. **Health check failing**: Verify application is responding on health endpoint
3. **Resource limits**: Adjust resource requests/limits as needed
4. **Storage issues**: Check persistent volume claims and access modes

### Useful Commands

```bash
# Check pod status
kubectl get pods

# View logs
kubectl logs -f deployment/mcp-client-bridge

# Port forward for local testing
kubectl port-forward service/mcp-client-bridge-service 3000:80

# Scale deployment
kubectl scale deployment mcp-client-bridge --replicas=3
```

## Contributing

For development and contribution guidelines, please refer to the main project documentation.