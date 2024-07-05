const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Management System Project',
      version: '1.0.0',
      description: 'API documentation for Event Registration',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Replace with your server URL
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = specs;
