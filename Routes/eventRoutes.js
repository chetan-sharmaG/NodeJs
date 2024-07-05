
const express = require('express');
const { validateRegisterData } = require('../Utils/validate');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AppError, errorHandler, methodNotAllowedHandler } = require('../Utils/errorHandler');
const { v4: uuidv4 } = require('uuid'); // For generating unique tokens
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config();

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;
const pageSize = 10;

const protect = require('../Utils/protect')
// Create event (Organizer)
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: APIs for managing events
 */

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *             example:
 *               title: Workshop on React
 *               description: Learn React fundamentals
 *               date: '2024-07-10T10:00:00Z'
 *               location: Online
 *     responses:
 *       201:
 *         description: Event created successfully
 *       403:
 *         description: Forbidden, user not authorized
 *       500:
 *         description: Internal server error
 */
router.route('/')
    .post(protect, async (req, res, next) => {
        try {
            if (req.user.role !== 'ORGANIZER') {
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            const { title, description, date, location } = req.body;
            const event = await prisma.event.create({
                data: {
                    title,
                    description,
                    date: new Date(date),
                    location,
                    organizerId: req.user.id
                }
            });
            res.status(201).json({ event });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })


// Endpoint for updating an event
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API endpoints for managing events
 */

/**
 * @swagger
 * /events/{eventId}:
 *   put:
 *     summary: Update an event (Organizer or Admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID of the event to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: string
 *             example:
 *               title: Updated Workshop on React Hooks
 *               description: Join us for an advanced session on React Hooks.
 *               date: 2024-07-15
 *               location: Virtual
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       403:
 *         description: Forbidden - Only organizers or admins can update events
 *       404:
 *         description: Event not found
 */

router.route('/:eventId')
    .put(protect, async (req, res, next) => {
        try {
            if (req.user.role === 'ATTENDEE') {
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            const { eventId } = req.params;
            const { title, description, date, location } = req.body;

            // Find the event by ID
            const event = await prisma.event.findUnique({
                where: { id: parseInt(eventId, 10) },
            });

            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to update this event' });
            }

            // Update the event with new details
            const updatedEvent = await prisma.event.update({
                where: { id: parseInt(eventId, 10) },
                data: {
                    title,
                    description,
                    date: new Date(date),
                    location
                },
            });

            res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    });

/**
* @swagger
* /events/{eventId}:
*   delete:
*     summary: Delete an event (Organizer or Admin only)
*     tags: [Events]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: eventId
*         required: true
*         schema:
*           type: integer
*           minimum: 1
*         description: ID of the event to delete
*     responses:
*       200:
*         description: Event deleted successfully
*       403:
*         description: Forbidden - Only organizers or admins can delete events
*       404:
*         description: Event not found
*/

router.route('/:eventId')
    .delete(protect, async (req, res, next) => {
        try {
            if (req.user.role === 'ATTENDEE') {
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            const { eventId } = req.params;
            const event = await prisma.event.findUnique({
                where: { id: parseInt(eventId, 10) },
            });

            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            // Check if the user is the creator of the event or an admin
            if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this event' });
            }

            // Delete the event
            await prisma.registration.deleteMany({
                where: { eventId: parseInt(eventId, 10) },
            });

            // Delete the event
            await prisma.event.delete({
                where: { id: parseInt(eventId, 10) },
            });

            res.status(200).json({ message: 'Event deleted successfully' });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    });


// Get events
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API endpoints for managing events
 */

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get events with optional filters and sorting
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter events by category
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter events by location
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort events by a specific field (e.g., 'date', 'title')
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: ['asc', 'desc']
 *         description: Sort order ('asc' for ascending, 'desc' for descending)
 *     responses:
 *       200:
 *         description: A list of events matching the provided filters and sorted as requested
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   location:
 *                     type: string
 *                   organizerId:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *             example:
 *               - id: 1
 *                 title: Event A
 *                 description: This is event A
 *                 date: 2024-07-10T10:00:00Z
 *                 location: New York
 *                 organizerId: 123
 *                 createdAt: 2024-07-05T08:00:00Z
 *                 updatedAt: 2024-07-05T08:00:00Z
 *               - id: 2
 *                 title: Event B
 *                 description: This is event B
 *                 date: 2024-07-15T14:00:00Z
 *                 location: San Francisco
 *                 organizerId: 456
 *                 createdAt: 2024-07-05T09:00:00Z
 *                 updatedAt: 2024-07-05T09:00:00Z
 *       400:
 *         description: Invalid query parameters or request format
 *       401:
 *         description: Unauthorized access
 */

router.route('/')
    .get(protect, async (req, res, next) => {
        try {
            let filters = {}; // Initialize empty filters

            const { category, location, sortBy, sortOrder } = req.query;

            // Add filters based on query parameters if provided
            if (category) {
                filters.category = category.toString();
            }
            if (location) {
                filters.location = location.toString();
            }

            // Prepare sorting options based on query parameters
            const orderBy = {};
            if (sortBy) {
                orderBy[sortBy.toString()] = sortOrder?.toString().toLowerCase() === 'desc' ? 'desc' : 'asc';
            }

            // Query events with optional filters and sorting
            const events = await prisma.event.findMany({
                where: filters,
                orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined, // Apply sorting if orderBy is not empty
            });

            res.status(200).json(events);
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })

/**
* @swagger
* /events/page/{pageNumber}:
*   get:
*     summary: Get paginated list of events
*     tags: [Events]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: pageNumber
*         required: true
*         schema:
*           type: integer
*           minimum: 1
*         description: Page number for pagination
*     responses:
*       200:
*         description: List of events for the specified page
*       400:
*         description: Invalid page number
*/
router.route('/page/:pageNumber').get(protect, async (req, res, next) => {
    try {
        const pageNumber = parseInt(req.params.pageNumber, 10);
        const skip = (pageNumber - 1) * pageSize;

        // Validate pageNumber
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json({ message: 'Invalid page number' });
        }

        // Query events with pagination
        const events = await prisma.event.findMany({
            skip: skip,
            take: pageSize,
            orderBy: { id: 'asc' }, // Example: Order by ID or another suitable field
        });

        res.status(200).json(events);
    } catch (err) {
        next(err);
    } finally {
        console.log('Disconnected from database');
        await prisma.$disconnect(); // Disconnect database connection
    }
});
// Register for event (Attendee)
/**
 * @swagger
 * /events/{eventId}/register:
 *   post:
 *     summary: Register for an event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to register for
 *     responses:
 *       201:
 *         description: Successfully registered for the event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 registration:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     userId:
 *                       type: integer
 *                     eventId:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *             example:
 *               registration:
 *                 id: 1
 *                 userId: 123
 *                 eventId: 1
 *                 createdAt: 2024-07-05T10:00:00Z
 *                 updatedAt: 2024-07-05T10:00:00Z
 *       400:
 *         description: Invalid request or user is already registered for the event
 *       401:
 *         description: Unauthorized access
 *       404:
 *         description: Event not found
 */

router.route('/:eventId/register')
    .post(protect, async (req, res, next) => {
        try {
            const eventId = parseInt(req.params.eventId, 10);
            const userId = req.user.id;

            const event = await prisma.event.findUnique({
                where: { id: eventId }
            });

            if (!event) {
                return next(new AppError('Event not found', 404));
            }

            // Check if the user is already registered for the event
            const existingRegistration = await prisma.registration.findUnique({
                where: { userId_eventId: { userId, eventId } }
            });

            if (existingRegistration) {
                return next(new AppError('You are already registered for this event', 400));
            }

            // Create new registration
            const newRegistration = await prisma.registration.create({
                data: {
                    userId,
                    eventId
                }
            });

            res.status(201).json({ registration: newRegistration });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })


/**
 * @swagger
 * events/delete/{eventId}:
 *   delete:
 *     summary: Delete event registration
 *     description: Deletes a user's registration for a specific event.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the event
 *     responses:
 *       200:
 *         description: Registration deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registration deleted successfully
 *       400:
 *         description: You are not registered for this event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You are not registered for this event
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Not authorized
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Event not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */

router.route('/delete/:eventId')
    .delete(protect, async (req, res, next) => {
        try {
            const eventId = parseInt(req.params.eventId, 10);
            const userId = req.user.id;

            // Delete registration based on userId and eventId
            const deletedRegistration = await prisma.registration.deleteMany({
                where: {
                    userId: userId,
                    eventId: eventId
                }
            });

            if (deletedRegistration.count === 0) {
                return next(new AppError('You are not registered for this event', 400));
            }

            res.status(200).json({ message: 'Registration deleted successfully' });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })
    .all(methodNotAllowedHandler);

// Provide feedback (Attendee)
/**
 * @swagger
 * /events/{eventId}/feedback:
 *   post:
 *     summary: Provide feedback for an event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to provide feedback for
 *       - in: body
 *         name: feedback
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             feedback:
 *               type: string
 *         description: Feedback content
 *     responses:
 *       201:
 *         description: Feedback provided successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feedback:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     userId:
 *                       type: integer
 *                     eventId:
 *                       type: integer
 *                     feedback:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *             example:
 *               feedback:
 *                 id: 1
 *                 userId: 123
 *                 eventId: 1
 *                 feedback: "Great event, learned a lot!"
 *                 createdAt: 2024-07-05T12:00:00Z
 *                 updatedAt: 2024-07-05T12:00:00Z
 *       400:
 *         description: Invalid request or user not registered for the event
 *       401:
 *         description: Unauthorized access
 *       404:
 *         description: Event not found
 */

router.route('/:eventId/feedback')
    .post(protect, async (req, res, next) => {

        try {
            const eventId = parseInt(req.params.eventId, 10);
            const userId = req.user.id;
            const { feedback } = req.body;

            // Check if the user is registered for the event
            const registration = await prisma.registration.findUnique({
                where: { userId_eventId: { userId, eventId } }
            });

            if (!registration) {
                return next(new AppError('You are not registered for this event', 400));
            }

            // Check if the user has already provided feedback for the event
            let existingFeedback = await prisma.feedback.findUnique({
                where: { userId_eventId: { userId, eventId } }
            });

            if (existingFeedback) {
                // Update existing feedback
                existingFeedback = await prisma.feedback.update({
                    where: { id: existingFeedback.id },
                    data: { feedback }
                });
                res.status(200).json({ feedback: existingFeedback });
            } else {
                // Create new feedback
                const newFeedback = await prisma.feedback.create({
                    data: {
                        userId,
                        eventId,
                        feedback
                    }
                });
                res.status(201).json({ feedback: newFeedback });
            }
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })
    .all(methodNotAllowedHandler);

// View event history (Attendee)
/**
 * @swagger
 * /events/history:
 *   get:
 *     summary: View event registration history for the authenticated user
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of events registered by the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 registrations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       userId:
 *                         type: integer
 *                       eventId:
 *                         type: integer
 *                       event:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           location:
 *                             type: string
 *                           organizerId:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *             example:
 *               registrations:
 *                 - id: 1
 *                   userId: 123
 *                   eventId: 1
 *                   event:
 *                     id: 1
 *                     title: Event A
 *                     description: This is event A
 *                     date: 2024-07-10T10:00:00Z
 *                     location: New York
 *                     organizerId: 456
 *                     createdAt: 2024-07-05T08:00:00Z
 *                     updatedAt: 2024-07-05T08:00:00Z
 *       401:
 *         description: Unauthorized access
 */

router.route('/history')
    .get(protect, async (req, res, next) => {
        try {
            if (req.user.role !== 'ATTENDEE') {
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            const registrations = await prisma.registration.findMany({
                where: { userId: req.user.id },
                include: { event: true }
            });
            res.status(200).json({ registrations });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })
    .all(methodNotAllowedHandler);

// Manage coupons (Admin)
router.route('/coupons')
    .post(protect, async (req, res, next) => {
        try {
            if (req.user.role !== 'ADMIN') {
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            const { code, discount, validUntil } = req.body;
            const coupon = await prisma.coupon.create({
                data: {
                    code,
                    discount,
                    validUntil: new Date(validUntil),
                    createdById: req.user.id
                }
            });
            res.status(201).json({ coupon });
        } catch (err) {
            next(err);
        } finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })
    .all(methodNotAllowedHandler);

module.exports = router;