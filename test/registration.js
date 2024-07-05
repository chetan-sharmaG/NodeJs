const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let token;
let eventId;

beforeAll(async () => {
  // await prisma.user.deleteMany();
  // await prisma.event.deleteMany();
  // await prisma.registration.deleteMany();

  // Register and login user to get token
  await request(app)
    .post('/register')
    .send({
      email: 'attendee@example.com',
      password: 'password123',
      role: 'ATTENDEE'
    });
    
  await request(app)
    .post('/register')
    .send({
      email: 'cs194555@gamil.com',
      password: 'password123',
      role: 'ORGANIZER'
    });


  const loginResponse = await request(app)
    .post('/login')
    .send({
      email: 'attendee@example.com',
      password: 'password123'
    });

  token = loginResponse.body.token;
    
  // Create an event to register for
  const organizerLoginResponse = await request(app)
    .post('/login')
    .send({
      email: 'cs194555@gamil.com',
      password: 'password123'
    });

  const organizerToken = organizerLoginResponse.body.token;
  console.log(organizerToken)


  const eventResponse = await request(app)
    .post('/events')
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      title: 'Sample Event',
      description: 'This is a sample event',
      date: '2024-07-30',
      location: 'Sample Location'
    });


 
  eventId = eventResponse.body.event.id;
});

describe('Event Registration Tests', () => {
  test('Register for an event', async () => {
    const response = await request(app)
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(201);
    expect(response.body.registration.eventId).toBe(eventId);
  });

  test('View event history', async () => {
    const response = await request(app)
      .get('/events/history')
      .set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.registrations.length).toBeGreaterThan(0);
  });

  test('Unregister from an event', async () => {
    const response = await request(app)
      .delete(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Registration deleted successfully');
  });
});
