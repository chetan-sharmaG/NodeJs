const { AppError } = require('./errorHandler');

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength (minimum 8 characters)
const validatePassword = (password) => {
  return password.length >= 8;
};

// Middleware to validate user registration data
const validateRegisterData = (req, res, next) => {
  const { email, password, role } = req.body;

  // Validate email
  if (!email || !validateEmail(email)) {
    return next(new AppError('Valid email is required', 400));
  }

  // Validate password
  if (!password || !validatePassword(password)) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  // Validate role (optional based on your requirements)
  if (!role || !['ADMIN', 'ORGANIZER', 'ATTENDEE'].includes(role)) {
    return next(new AppError("Valid role is required (e.g. 'ADMIN', 'ORGANIZER', 'ATTENDEE')", 400));
  }

  next();
};

module.exports = { validateRegisterData };
