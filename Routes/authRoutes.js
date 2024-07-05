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
const protect = require('../Utils/protect');
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication APIs
 */
// Register user
// Your API routes
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *             example:
 *               email: test@example.com
 *               password: password123
 *               role: ATTENDEE
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Bad request
 */
router.post('/register', validateRegisterData, async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role
            }
        });
        res.status(201).json({ user });
    } catch (err) {
        if (err.code === 'P2002') {
            return next(new AppError('Email already exists', 400));
        }
        next(err);
    }
    finally {
        console.log('Disconnected from database');
        await prisma.$disconnect(); // Disconnect database connection
    }
});

// Login user
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               email: test@example.com
 *               password: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Access token
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.route('/login')
    .post(async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const user = await prisma.user.findUnique({ where: { email } });

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return next(new AppError('Incorrect email or password', 401));
            }

            const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
            res.status(200).json({ token });
        } catch (err) {
            next(err);
        }
        finally {
            console.log('Disconnected from database');
            await prisma.$disconnect(); // Disconnect database connection
        }
    })
    .all(methodNotAllowedHandler);


/**
* @swagger
* tags:
*   name: Authentication
*   description: Endpoints related to user authentication
*/

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout the user and invalidate the JWT token.
 *     description: Invalidates the JWT token stored on the client-side to log the user out.
 *     tags: [Authentication]
 *     responses:
 *       '200':
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       '401':
 *         description: Unauthorized. The user is not authenticated.
 */
router.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
});


/**
* @swagger
* tags:
*   name: Authentication
*   description: Endpoints related to user authentication
*/
/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     description: Deletes a user account. Only the user themselves or an admin can perform this action.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       403:
 *         description: You do not have permission to delete this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You do not have permission to delete this user
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not found
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

router.delete('/users/:userId', protect, async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Check if the user is trying to delete their own account or if an admin is performing the action
        if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(userId, 10)) {
            return res.status(403).json({ message: 'You do not have permission to delete this user' });
        }

        // Delete the user
        await prisma.user.delete({
            where: {
                id: parseInt(userId, 10)
            }
        });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        next(err);
    }
});


module.exports = router;

