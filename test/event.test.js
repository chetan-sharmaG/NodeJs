// Import necessary dependencies
const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Initialize variables
let token;
let eventId;
let userId;

/**
 * Setup function to register and login user and get token
 */
beforeAll(async () => {
  // Register user
  const registerResponse = await request(app)
    .post('/auth/register')
    .send({
      email: 'organizer110@example.com',
      password: 'password123',
      role: 'ORGANIZER'
    });
  userId = registerResponse.body.user.id;

  // Login user and get token
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({
      email: 'organizer110@example.com',
      password: 'password123'
    });
  token = loginResponse.body.token;
});

/**
 * Test suite for event endpoint
 */
describe('Event Tests', () => {
  /**
   * Test case for creating a new event
   */
  test('Create a new event', async () => {
    const response = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sample Event',
        description: 'This is a sample event',
        date: '2024-07-30',
        location: 'Sample Location'
      });
    eventId = response.body.event.id;
    expect(response.statusCode).toBe(201);
    expect(response.body.event.title).toBe('Sample Event');
  });

  /**
   * Test case for getting all events
   */
  test('Get all events', async () => {
    const response = await request(app)
      .get('/events')
      .set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  /**
   * Test case for updating an event
   */
  test('Update an event', async () => {
    const response = await request(app)
      .put(`/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Event',
        description: 'Updated description',
        date: '2024-08-01',
        location: 'Updated Location'
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.event.title).toBe('Updated Event');
  });

  /**
   * Test case for deleting an event
   */
  test('Delete an event', async () => {
    const response = await request(app)
      .delete(`/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Event deleted successfully');
  });
});

/**
 * Clean up after all tests have run
 */
afterAll(async () => {
  // Delete user account
  await request(app)
    .delete(`/auth/users/${userId}`)
    .set('Authorization', `Bearer ${token}`);

  // Disconnect Prisma client
  await prisma.$disconnect();
});
