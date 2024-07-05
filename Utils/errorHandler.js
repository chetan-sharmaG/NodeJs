class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    // Custom error messages
    let message = err.message;
    if (err.name === 'JsonWebTokenError') {
      message = 'Invalid token. Please log in again.';
      err.statusCode = 401;
    } else if (err.name === 'TokenExpiredError') {
      message = 'Your token has expired. Please log in again.';
      err.statusCode = 401;
    } else if (err.message.includes('method not allowed')) {
      message = 'This method is not allowed for the requested endpoint.';
      err.statusCode = 405;
    } else if (err.code === 'P2002') {
      message = 'Duplicate field value entered.';
      err.statusCode = 400;
    } else if (err.message.includes('not authorized')) {
      message = 'You are not authorized to perform this action.';
      err.statusCode = 403;
    } else if (err.message.includes('not found')) {
      message = 'Resource not found.';
      err.statusCode = 404;
    }
  
    res.status(err.statusCode).json({
      status: err.status,
      message
    });
  };
  
  const methodNotAllowedHandler = (req, res, next) => {
    next(new AppError('Method not allowed', 405));
  };
  
  module.exports = { AppError, errorHandler, methodNotAllowedHandler };
  