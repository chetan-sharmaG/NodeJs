const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { AppError, errorHandler, methodNotAllowedHandler } = require('../Utils/errorHandler');
require('dotenv').config();
const prisma = new PrismaClient();

const jwtSecret = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, jwtSecret);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) {
            return next(new AppError('No user found with this id', 404));
        }

        req.user = user;
        next();
    } catch (err) {
        return next(new AppError('Not authorized', 401));
    }
};

module.exports = protect;