/**
 * Test suite for authentication endpoints
 */
const request = require('supertest');
const app = require('../index'); // Your express app
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// const setup = require('./setup');

let userId;
let token;

/**
 * Tests for authentication endpoints
 */
describe('Authentication Tests', () => {

    /**
     * Test case for registering a new user
     */
    test('Register a new user', async () => {
        // Send a POST request to the /register endpoint with user data
        const response = await request(app)
            .post('/auth/register')
            .send({
                email: 'test110@example.com',
                password: 'password123',
                role: 'ATTENDEE'
            });
        
        // Extract the user ID from the response
        userId = response.body.user.id;
        
        // Assert that the response status code is 201 (created)
        expect(response.statusCode).toBe(201);
        
        // Assert that the response body contains the registered user's email
        expect(response.body.user.email).toBe('test110@example.com');
    });

    /**
     * Test case for logging in with a registered user
     */
    test('Login with registered user', async () => {
        // Send a POST request to the /login endpoint with user credentials
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test110@example.com',
                password: 'password123'
            });
        
        // Extract the authentication token from the response
        token = response.body.token;
        
        // Assert that the response status code is 200 (OK)
        expect(response.statusCode).toBe(200);
        
        // Assert that the response body contains an authentication token
        expect(response.body.token).toBeDefined();
    });
});

/**
 * Clean up after all tests have run
 */
afterAll(async () => {
    // Delete the user account
    await request(app)
        .delete(`/auth/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);
    
    // Disconnect the Prisma client
    await prisma.$disconnect();
});
