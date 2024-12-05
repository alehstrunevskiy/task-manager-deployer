#!/bin/bash

# Set constants
BUCKET_NAME="pmtracker-deploy-2024-bucket"
BASE_DOMAIN="pmtracker.io"
HOSTED_ZONE_ID="Z0273099NVGL71O1R32G"
EC2_IP="52.15.70.100"
AWS_REGION="us-east-2"
STACK_NAME="pmtracker-deploy-2024"

# Package Lambda functions
cd lambda-functions
for d in */ ; do
    cd "$d"
    zip -r "../${d%/}.zip" .
    cd ..
done

# Create S3 bucket if it doesn't exist
aws s3 mb s3://$BUCKET_NAME

# Upload Lambda functions to S3
echo "Uploading Lambda functions to S3..."
aws s3 cp . s3://$BUCKET_NAME/lambda/ --recursive --exclude "*" --include "*.zip"

cd ..

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."

# Check and delete existing stack if necessary
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_FOUND")

if [ "$STACK_STATUS" != "STACK_NOT_FOUND" ]; then
    echo "Deleting existing stack..."
    # List and remove all stack resources
    aws cloudformation list-stack-resources --stack-name $STACK_NAME --query 'StackResourceSummaries[*].[LogicalResourceId,ResourceType,PhysicalResourceId]' --output text
    
    # Force delete the stack
    aws cloudformation delete-stack --stack-name $STACK_NAME
    
    echo "Waiting for stack deletion..."
    sleep 30  # Give some time for deletion to start
fi

# Create new stack
echo "Creating new stack..."
aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://infrastructure/template.yaml \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --parameters \
        ParameterKey=BaseDomain,ParameterValue=$BASE_DOMAIN \
        ParameterKey=HostedZoneId,ParameterValue=$HOSTED_ZONE_ID \
        ParameterKey=EC2IP,ParameterValue=$EC2_IP \
        ParameterKey=DeploymentBucket,ParameterValue=$BUCKET_NAME

# Wait for stack creation and show events if failed
echo "Waiting for stack creation..."
if ! aws cloudformation wait stack-create-complete --stack-name $STACK_NAME; then
    echo "Stack creation failed. Checking events..."
    aws cloudformation describe-stack-events \
        --stack-name $STACK_NAME \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
        --output text
    exit 1
fi

# Get API endpoint and create .env file for React
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name pmtracker-deploy-2024 \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

# Create .env file for React
cat > .env << EOL
REACT_APP_API_ENDPOINT=${API_ENDPOINT}
REACT_APP_REGION=${AWS_REGION}
EOL

echo "Deployment complete! API endpoint: ${API_ENDPOINT}"