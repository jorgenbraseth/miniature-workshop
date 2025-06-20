#!/bin/bash

# Miniature Workshop Deployment Script
# This script deploys both the backend and frontend components

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

echo -e "${BLUE}🚀 Deploying Miniature Workshop to Production${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured or not authenticated${NC}"
    echo "Please run 'aws configure' or set AWS credentials"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found, installing...${NC}"
    npm install -g pnpm
fi

# Check if Serverless Framework is installed
if ! command -v serverless &> /dev/null; then
    echo -e "${YELLOW}⚠️  Serverless Framework not found, installing...${NC}"
    pnpm add -g serverless
fi

# Check environment variables
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo -e "${RED}❌ GOOGLE_CLIENT_ID environment variable is not set${NC}"
    echo "Please set your Google OAuth client ID:"
    echo "export GOOGLE_CLIENT_ID='your-client-id.apps.googleusercontent.com'"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Deploy Backend
echo -e "${BLUE}🔧 Deploying backend...${NC}"
cd $BACKEND_DIR

echo "Installing backend dependencies..."
pnpm install

echo "Deploying backend to AWS..."
pnpm run deploy

# Get API Gateway URL from serverless output
API_URL=$(serverless info --stage prod | grep "HttpApiUrl" | awk '{print $2}')

if [ -z "$API_URL" ]; then
    echo -e "${RED}❌ Failed to get API Gateway URL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend deployed successfully${NC}"
echo -e "${GREEN}📡 API URL: ${API_URL}${NC}"

cd ..

# Deploy Frontend
echo -e "${BLUE}🎨 Deploying frontend...${NC}"
cd $FRONTEND_DIR

echo "Installing frontend dependencies..."
pnpm install

echo "Building frontend..."
VITE_API_BASE_URL=$API_URL pnpm run build

echo "Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod --yes
    echo -e "${GREEN}✅ Frontend deployed to Vercel${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Please install it or deploy manually:${NC}"
    echo "pnpm add -g vercel"
    echo "vercel --prod"
fi

cd ..

# Summary
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "  ${BLUE}Backend API:${NC} $API_URL"
echo -e "  ${BLUE}DynamoDB Tables:${NC} miniature-workshop-backend-prod-*"
echo -e "  ${BLUE}S3 Bucket:${NC} miniature-workshop-backend-prod-images"

echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update your frontend environment variables with the API URL"
echo "2. Configure Google OAuth allowed origins"
echo "3. Test the deployment"

echo -e "${GREEN}✨ Happy painting!${NC}"

export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
./deploy.sh dev 