# Water Tank Monitoring System - Backend

This is the backend API for the Water Tank Monitoring System, built with NestJS and MongoDB.

## Setup Instructions

### Prerequisites
- Node.js (v14 or later)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file in the project root
   - Add the following variables:
     ```
     MONGODB_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster>.mongodb.net/water_tank_app
     JWT_SECRET=your-super-secret-key-change-in-production
     JWT_EXPIRATION=1d
     PORT=3000
     ```
   - Replace the MongoDB URI with your actual connection string

4. Start the application:
   ```bash
   npm run start:dev
   ```

## Authentication

The API uses JWT for authentication. The following endpoints are available:

### Register a new user
```
POST /api/auth/register
```
Request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "customer"  // customer, supplier, or admin
}
```

### Login
```
POST /api/auth/login
```
Request body:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Refresh Token
```
POST /api/auth/refresh-token
```
Requires a valid JWT token in the Authorization header.

## Protected Routes

All protected routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

### Get Current User Profile
```
GET /api/users/me
```

### Update User Profile
```
PATCH /api/users/me
```

### Update Notification Preferences
```
PATCH /api/users/notification-preferences
```

## Role-Based Access Control

Some endpoints are restricted to specific user roles:

- Customer: Can manage their own tanks and place orders
- Supplier: Can manage deliveries and update order status
- Admin: Has full access to all resources

## API Documentation

Once the server is running, you can access the API documentation at:
```
http://localhost:3000/api
```
