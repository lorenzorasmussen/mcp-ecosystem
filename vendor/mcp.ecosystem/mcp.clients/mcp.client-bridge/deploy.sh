#!/bin/bash

# Deployment script for MCP Client Bridge
set -e

# Default values
NAMESPACE="default"
HELM_RELEASE_NAME="mcp-client-bridge"
IMAGE_TAG="latest"
TIMEOUT="10m"

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -n, --namespace NAMESPACE    Kubernetes namespace (default: default)"
    echo "  -r, --release NAME          Helm release name (default: mcp-client-bridge)"
    echo "  -i, --image-tag TAG         Docker image tag (default: latest)"
    echo "  -t, --timeout DURATION      Deployment timeout (default: 10m)"
    echo "  --dry-run                   Run helm template without applying"
    echo "  -h, --help                  Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            HELM_RELEASE_NAME="$2"
            shift 2
            ;;
        -i|--image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

echo "Starting MCP Client Bridge deployment..."
echo "Namespace: $NAMESPACE"
echo "Release: $HELM_RELEASE_NAME"
echo "Image Tag: $IMAGE_TAG"
echo "Timeout: $TIMEOUT"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo "Error: helm is not installed or not in PATH"
    exit 1
fi

# Create namespace if it doesn't exist
kubectl get namespace $NAMESPACE &> /dev/null || kubectl create namespace $NAMESPACE

# Set image tag in values file or use --set flag
if [ "$DRY_RUN" = true ]; then
    echo "Running helm template (dry run)..."
    helm template $HELM_RELEASE_NAME ./helm \
        --namespace $NAMESPACE \
        --set image.tag=$IMAGE_TAG
else
    echo "Upgrading/Installing Helm release..."
    helm upgrade --install $HELM_RELEASE_NAME ./helm \
        --namespace $NAMESPACE \
        --create-namespace \
        --set image.tag=$IMAGE_TAG \
        --timeout $TIMEOUT

    echo "Waiting for deployment to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=mcp-client-bridge \
        --namespace $NAMESPACE \
        --timeout=$TIMEOUT

    echo "Deployment completed successfully!"
    echo ""
    echo "Services:"
    kubectl get svc -n $NAMESPACE -l app.kubernetes.io/name=mcp-client-bridge
    echo ""
    echo "Pods:"
    kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=mcp-client-bridge
fi