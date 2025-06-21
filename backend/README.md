# Miniature Workshop Backend

Backend API for Miniature Workshop - A comprehensive tool for documenting and sharing miniature painting techniques.

## Architecture

Built with AWS serverless architecture using:
- **AWS Lambda** for API endpoints
- **Amazon DynamoDB** for data storage
- **Amazon S3** for image storage
- **Google OAuth** for authentication

## Prerequisites

1. **Node.js** (version 20 or higher)
2. **AWS CLI** configured with appropriate credentials
3. **Serverless Framework** CLI (`pnpm add -g serverless`)
4. **Google Cloud Console** project with OAuth credentials

## Quick Start

```bash
pnpm install
```

## Configuration

Create environment variables or update `serverless.yml`:

```yaml
environment:
  GOOGLE_CLIENT_ID: ${env:GOOGLE_CLIENT_ID}
  STAGE: ${self:provider.stage}
```

## Deployment

```bash
pnpm run deploy
```

This will:
1. Bundle TypeScript code
2. Deploy Lambda functions
3. Create DynamoDB tables
4. Set up S3 bucket for images
5. Configure API Gateway routes

## API Endpoints

### Authentication
- `POST /auth/google` - Authenticate with Google OAuth token

### Units
- `GET /units` - List all units (public)
- `POST /units` - Create new unit (authenticated)
- `GET /units/{id}` - Get unit details
- `PUT /units/{id}` - Update unit (authenticated, owner only)
- `DELETE /units/{id}` - Delete unit (authenticated, owner only)

### Steps
- `GET /units/{unitId}/steps` - List steps for a unit
- `POST /units/{unitId}/steps` - Add step to unit (authenticated)
- `PUT /steps/{id}` - Update step (authenticated, owner only)
- `DELETE /steps/{id}` - Delete step (authenticated, owner only)

### Images
- `POST /images/upload-url` - Get presigned URL for image upload (authenticated)
- `GET /images/{id}` - Get image (public)

### Sync
- `POST /sync` - Sync local data to cloud (authenticated)
- `GET /sync/since/{timestamp}` - Get changes since timestamp (authenticated)

## Development

### Local Development
```bash
pnpm run offline
```

### Testing
```bash
pnpm test
```

### Linting
```bash
pnpm run lint
```

### Building
```bash
pnpm run build
```

## Deployment Stages

- **Development**: `serverless deploy --stage dev`
- **Production**: `pnpm run deploy`

## Environment Variables

Required environment variables:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `AWS_ACCESS_KEY_ID` - AWS access key (for deployment)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (for deployment)

## Database Schema

### Units Table
- `id` (String, Primary Key)
- `name` (String)
- `description` (String)
- `gameSystem` (String)
- `faction` (String)
- `userId` (String, GSI)
- `createdAt` (String)
- `updatedAt` (String)

### Steps Table
- `id` (String, Primary Key)
- `unitId` (String, GSI)
- `title` (String)
- `description` (String)
- `techniques` (List)
- `paints` (List)
- `brushes` (List)
- `photos` (List)
- `order` (Number)
- `userId` (String)
- `createdAt` (String)
- `updatedAt` (String)

### Users Table
- `id` (String, Primary Key)
- `email` (String, GSI)
- `name` (String)
- `picture` (String)
- `createdAt` (String)
- `lastLoginAt` (String)

## Error Handling

The API uses standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Security

- All write operations require authentication
- Users can only modify their own content
- Google OAuth tokens are validated on each request
- Input validation using Joi schemas
- CORS enabled for frontend domains

## Monitoring

AWS CloudWatch automatically monitors:
- Lambda function execution
- API Gateway requests
- DynamoDB operations
- Error rates and latency

## Troubleshooting

1. **Deployment fails**: Check AWS credentials and permissions
2. **Authentication errors**: Verify Google OAuth client ID
3. **CORS issues**: Check allowed origins in serverless.yml
4. **Database errors**: Verify DynamoDB table creation and indexes

## Contributing

1. Create feature branch
2. Add tests for new functionality
3. Update documentation
4. Submit pull request 