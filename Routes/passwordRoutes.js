
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // For generating unique tokens
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config();

const prisma = new PrismaClient();
const from_email = process.env.EMAIL;
const email_token = process.env.EMAIL_TOKEN;

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API endpoints for user authentication and password management
 */

/**
 * @swagger
 * /password-reset:
 *   post:
 *     summary: Request password reset
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
 *                 format: email
 *             required:
 *               - email
 *           example:
 *             email: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       400:
 *         description: Invalid request body or user not found
 *       500:
 *         description: Failed to send password reset email
 */

// Route to request password reset
router.post('/password-reset', async (req, res, next) => {
    try {
        const { email } = req.body;

        // Check if user with the provided email exists
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a unique token for password reset
        const resetToken = uuidv4();

        // Update user record with reset token and expiration time (e.g., 1 hour)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetToken,
                resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
            },
        });

        // Send password reset email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: from_email,
                pass: email_token,
            },
        });

        const mailOptions = {
            from: from_email,
            to: user.email,
            subject: 'Password Reset Request',
            text: `Click on the following link to reset your password: http://localhost:3000/reset-password/${resetToken}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Failed to send password reset email' });
            }
            console.log('Email sent: ' + info.response);
            res.status(200).json({ message: 'Password reset email sent' });
        });

    } catch (err) {
        next(err);
    } finally {
        console.log('Disconnected from database');
        await prisma.$disconnect(); // Disconnect database connection
    }
});

/**
 * @swagger
 * /reset-password/{resetToken}:
 *   post:
 *     summary: Reset password using reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: resetToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Token received via email for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *             required:
 *               - newPassword
 *           example:
 *             newPassword: newSecurePassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired reset token or missing newPassword
 */

// Route to reset password using reset token
router.post('/reset-password/:resetToken', async (req, res, next) => {
    try {
        const { resetToken } = req.params;
        const { newPassword } = req.body;

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: { resetToken: resetToken },
        });

        // Check if the user exists and if the reset token is valid and not expired
        if (!user || user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        res.status(200).json({ message: 'Password reset successful' });

    } catch (err) {
        next(err);
    } finally {
        console.log('Disconnected from database');
        await prisma.$disconnect(); // Disconnect database connection
    }
});

module.exports = router;

