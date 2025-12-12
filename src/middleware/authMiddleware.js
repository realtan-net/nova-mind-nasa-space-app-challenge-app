const jwt = require("jsonwebtoken");
const config = require("../config/config");

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: "MISSING_AUTH_HEADER",
          message: "Authorization header is required",
        },
        requestTimestamp: new Date().toISOString(),
      });
    }

    // Check for Bearer token format
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_AUTH_FORMAT",
          message: "Authorization header must be in format: Bearer <token>",
        },
        requestTimestamp: new Date().toISOString(),
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Access token has expired. Please refresh your token.",
        },
        requestTimestamp: new Date().toISOString(),
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid access token",
        },
        requestTimestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Authentication error occurred",
      },
      requestTimestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user info if token is valid, but doesn't require authentication
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    // Token is invalid, but we don't require authentication
    next();
  }
};

module.exports = authMiddleware;
module.exports.optional = optionalAuthMiddleware;
