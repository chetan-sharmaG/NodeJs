/**
 * Main application module.
 * This module sets up the Express application and defines the routes.
 */

const express = require('express'); // Express framework for building the API
const { PrismaClient } = require('@prisma/client'); // Prisma ORM for interacting with the database
const { errorHandler } = require('./Utils/errorHandler'); // Custom error handling middleware
const swaggerUi = require('swagger-ui-express'); // Swagger UI for API documentation
const specs = require('./swagger'); // Swagger specification for API documentation
const authRoutes = require('./Routes/authRoutes'); // Authentication routes
const passwordRoute = require('./Routes/passwordRoutes'); // Password management routes
const eventRoutes = require('./Routes/eventRoutes'); // Event management routes

// Create the Express application
const app = express();

// Set up middleware to parse JSON requests
app.use(express.json());

// Set up middleware to serve Swagger UI for API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Set up authentication routes
app.use('/auth', authRoutes);

// Set up password management routes
app.use('/password', passwordRoute);

// Set up event management routes
app.use('/events', eventRoutes);

// Use error handling middleware
app.use(errorHandler);

// Export the Express application
module.exports = app; // Ensure app is exported

