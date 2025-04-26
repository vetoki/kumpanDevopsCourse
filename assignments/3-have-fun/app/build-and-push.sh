#!/bin/bash
set -e

# Check if repository name is provided
if [ -z "$1" ]; then
  echo "Error: Repository name for the assignment is required - should be your username"
  echo "Usage: $0 <repository-name>"
  exit 1
fi

# Configuration
APP_NAME="assignment3-lambda-app"
AWS_REGION="eu-north-1"
AWS_PROFILE="kumpan-devops"
REPOSITORY_NAME=$1
IMAGE_TAG="latest"
AWS_ACCOUNT_ID="289831833738"

# ECR repository URI
ECR_REPOSITORY="assignment3/${REPOSITORY_NAME}"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Login to ECR
echo "Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | docker login --username AWS --password-stdin $ECR_URI

# Build the Docker image
echo "Building Docker image..."
docker build -t ${APP_NAME}:${IMAGE_TAG} ./

# Tag the image for ECR
echo "Tagging image for ECR..."
docker tag ${APP_NAME}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}

# Push the image to ECR
echo "Pushing image to ECR..."
docker push ${ECR_URI}:${IMAGE_TAG}

echo "Done! Image pushed to ${ECR_URI}:${IMAGE_TAG}"
echo "You can now use this image in your Kubernetes deployments."
