/**
 * Custom error classes for consistent error handling across the app.
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Authentication error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = "You are not authorized to perform this action") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Conflict error (409)
 */
class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Plan limit error (403 with special flag)
 */
class PlanLimitError extends AppError {
  constructor(message, limit) {
    super(message, 403);
    this.name = "PlanLimitError";
    this.limit = limit;
    this.planLimitExceeded = true;
  }
}

/**
 * Subscription error (403)
 */
class SubscriptionError extends AppError {
  constructor(message, reason) {
    super(message, 403);
    this.name = "SubscriptionError";
    this.reason = reason;
  }
}

/**
 * Express error-handling middleware.
 * Catches errors from controllers and sends a consistent JSON response.
 */
export const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details || [];

  // Log all errors (except operational ones in production)
  if (!err.isOperational) {
    console.error("Unhandled error:", err);
  }

  // Build response
  const response = {
    success: false,
    message,
  };

  // Add details for validation errors
  if (details.length > 0) {
    response.details = details;
  }

  // Add special flags for plan/subscription errors
  if (err.planLimitExceeded) {
    response.plan_limit_exceeded = true;
    response.limit = err.limit;
  }

  if (err.name === "SubscriptionError") {
    response.subscription_error = true;
    response.reason = err.reason;
  }

  // In development, include stack trace for debugging
  if (process.env.NODE_ENV === "development" && !err.isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Express middleware for handling 404 (not found) routes.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(
    `Route ${req.method} ${req.originalUrl} not found`
  );
  next(error);
};

export { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, PlanLimitError, SubscriptionError };
