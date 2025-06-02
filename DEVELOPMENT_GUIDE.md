# Water Tank Monitoring System - Development Guide

This guide provides detailed information for developers working on the Water Tank Monitoring System backend.

## Getting Started with Development

### Setting Up Your Development Environment

1. Ensure you have the following installed:
   - Node.js (v14 or later)
   - npm or yarn
   - MongoDB (local installation or Atlas account)
   - Git

2. Clone the repository:
   ```bash
   git clone <repository-url>
   cd water_level_app_backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up your local environment variables:
   - Copy `.env.example` to `.env`
   - Update the variables with your local configuration

5. Start the development server:
   ```bash
   npm run start:dev
   ```

## API Structure and Extension

The API follows a modular approach with these key components:

### 1. Authentication Module
- Location: `src/auth`
- Key files:
  - `auth.module.ts`: Module configuration
  - `auth.service.ts`: Authentication logic
  - `auth.controller.ts`: Auth endpoints
  - `strategies/jwt.strategy.ts`: JWT implementation
  - `guards/jwt-auth.guard.ts`: Route protection

### 2. Models
- Location: `src/models`
- Each model represents a MongoDB collection
- Uses Mongoose schemas with TypeScript interfaces
- Implements validation rules via class-validator

### 3. Feature Modules
- Users: `src/users`
- Tanks: `src/tanks`
- Water Levels: `src/water-levels`
- Orders: `src/orders`
- Notifications: `src/notifications`

### 4. DTOs (Data Transfer Objects)
- Used for validation and API documentation
- Located in `dto` folders within each module

## Adding New Features

### Creating a New Module

```bash
# Using NestJS CLI
nest generate module new-feature
nest generate controller new-feature
nest generate service new-feature
```

### Creating a New Model

1. Create a new file in `src/models` (e.g., `new-feature.schema.ts`)
2. Define the schema using Mongoose and @nestjs/mongoose decorators
3. Add the model to `src/models/index.ts`

### Creating DTOs

1. Create a new DTO file in the feature's dto directory
2. Define validation rules using class-validator decorators
3. Implement proper typing

## Testing

### Unit Tests

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov
```

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

## Deployment

### Production Build

```bash
# Create production build
npm run build

# Start production server
npm run start:prod
```

### Containerization with Docker

1. Build the Docker image:
   ```bash
   docker build -t water-tank-app-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env water-tank-app-backend
   ```

### Cloud Deployment Options

1. **AWS**:
   - Use Elastic Beanstalk for easy deployment
   - Use EC2 for more control
   - Use MongoDB Atlas for the database

2. **Azure**:
   - Use App Service
   - Use Cosmos DB (MongoDB API)

3. **Google Cloud**:
   - Use Cloud Run
   - Use MongoDB Atlas

## Monitoring and Logging

1. Implement logging using Winston or Pino
2. Set up monitoring with:
   - New Relic
   - Datadog
   - Prometheus + Grafana

## Best Practices

1. **Code Quality**:
   - Follow NestJS best practices
   - Use ESLint for code quality
   - Document using JSDoc comments

2. **Security**:
   - Regularly update dependencies
   - Use Helmet middleware
   - Implement rate limiting
   - Use CORS configuration
   - Regular security audits

3. **Performance**:
   - Implement caching strategies
   - Use database indexing
   - Consider MongoDB aggregation for complex queries
   - Use connection pooling

4. **CI/CD**:
   - Set up a GitHub Actions pipeline
   - Implement automated testing
   - Automated deployment to staging/production

## Future Enhancements

1. **Real-time Features**:
   - Implement Socket.io for real-time updates
   - Add WebSocket support for water level monitoring

2. **Mobile Integration**:
   - Push notification service
   - Mobile-specific API endpoints

3. **Analytics**:
   - Water usage patterns
   - Predictive maintenance
   - Cost optimization
