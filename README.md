# Water Tank Monitoring System - Backend API

This is the backend API for the Water Tank Monitoring System, built with NestJS and MongoDB. The system allows users to monitor their water tank levels, place orders for water delivery, and receive notifications.

## Features

- **User Authentication** - Register, login, and token-based authentication
- **Water Tank Management** - Register tanks, track water levels, and configure settings
- **Order Processing** - Place, track, and manage water delivery orders
- **Supplier Management** - Suppliers can view and update order status
- **Real-time Water Level Monitoring** - IoT integration for real-time water level updates
- **Notifications** - Receive alerts for low water levels, order status changes, and more
- **Role-Based Access Control** - Different permissions for customers, suppliers, and admins

## Architecture

The backend is built using a modular architecture with the following components:

- **NestJS Framework** - A TypeScript-based Node.js framework
- **MongoDB** - NoSQL database for flexible data storage
- **JWT Authentication** - Secure token-based authentication
- **Mongoose ODM** - Object Document Mapper for MongoDB
- **Validation** - Request validation using class-validator
- **Dependency Injection** - NestJS built-in DI container

## Setup Instructions

### Prerequisites
- Node.js (v14 or later)
- MongoDB (local or Atlas)
- npm or yarn
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
