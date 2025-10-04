class ErrorHandler {
  
  /**
   * Handle application errors and return consistent error responses
   * @param {Error} error 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static handleError(error, req, res, next) {
    console.error('Error occurred:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Determine status code and error type
    const statusCode = error.statusCode || error.code || 500;
    const errorCode = error.code || 'INTERNAL_ERROR';

    let errorResponse;

    switch (errorCode) {
      case 'VALIDATION_ERROR':
        errorResponse = ErrorHandler.createValidationError(error);
        break;
      
      case 'EXTERNAL_API_ERROR':
      case 'API_TIMEOUT':
      case 'NETWORK_ERROR':
        errorResponse = ErrorHandler.createExternalApiError(error);
        break;
      
      case 'NOT_FOUND':
        errorResponse = ErrorHandler.createNotFoundError(error);
        break;
      
      case 'RATE_LIMIT':
        errorResponse = ErrorHandler.createRateLimitError(error);
        break;
      
      default:
        errorResponse = ErrorHandler.createGenericError(error);
    }

    res.status(ErrorHandler.getHttpStatusCode(errorCode)).json({
      success: false,
      error: errorResponse,
      requestTimestamp: new Date().toISOString()
    });
  }

  /**
   * Create validation error response
   * @param {Error} error 
   * @returns {Object}
   */
  static createValidationError(error) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input parameters',
      details: error.details || [{
        field: 'unknown',
        message: error.message,
        provided: null
      }]
    };
  }

  /**
   * Create external API error response
   * @param {Error} error 
   * @returns {Object}
   */
  static createExternalApiError(error) {
    const response = {
      code: error.code,
      message: error.message || 'External API error occurred'
    };

    if (error.code === 'API_TIMEOUT') {
      response.details = {
        reason: 'Request timeout',
        retryAfter: 30
      };
    } else if (error.upstreamStatus) {
      response.details = {
        upstreamStatus: error.upstreamStatus,
        retryAfter: this.calculateRetryAfter(error.upstreamStatus)
      };
    } else {
      response.details = {
        reason: error.originalError || 'Unknown external API error'
      };
    }

    return response;
  }

  /**
   * Create not found error response
   * @param {Error} error 
   * @returns {Object}
   */
  static createNotFoundError(error) {
    return {
      code: 'NOT_FOUND',
      message: error.message || 'Requested resource not found',
      details: {
        resource: error.resource || 'unknown'
      }
    };
  }

  /**
   * Create rate limit error response
   * @param {Error} error 
   * @returns {Object}
   */
  static createRateLimitError(error) {
    return {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later',
      details: {
        retryAfter: error.retryAfter || 900, // 15 minutes default
        limit: error.limit,
        remaining: 0
      }
    };
  }

  /**
   * Create generic error response
   * @param {Error} error 
   * @returns {Object}
   */
  static createGenericError(error) {
    return {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' 
        ? { originalError: error.message }
        : {}
    };
  }

  /**
   * Get HTTP status code based on error code
   * @param {string} errorCode 
   * @returns {number}
   */
  static getHttpStatusCode(errorCode) {
    const statusCodeMap = {
      'VALIDATION_ERROR': 400,
      'NOT_FOUND': 404,
      'RATE_LIMIT': 429,
      'EXTERNAL_API_ERROR': 502,
      'API_TIMEOUT': 504,
      'NETWORK_ERROR': 502,
      'INTERNAL_ERROR': 500
    };

    return statusCodeMap[errorCode] || 500;
  }

  /**
   * Calculate retry after time based on upstream status
   * @param {number} upstreamStatus 
   * @returns {number}
   */
  static calculateRetryAfter(upstreamStatus) {
    switch (upstreamStatus) {
      case 429: return 300; // 5 minutes for rate limits
      case 503: return 600; // 10 minutes for service unavailable
      case 500: return 60;  // 1 minute for server errors
      default: return 30;   // 30 seconds default
    }
  }

  /**
   * Create custom application error
   * @param {string} message 
   * @param {string} code 
   * @param {number} statusCode 
   * @param {Object} details 
   * @returns {Error}
   */
  static createError(message, code, statusCode = 500, details = null) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    
    if (details) {
      error.details = details;
    }
    
    return error;
  }

  /**
   * Create validation error with detailed field information
   * @param {Array} validationErrors 
   * @returns {Error}
   */
  static createValidationErrorWithDetails(validationErrors) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.statusCode = 400;
    error.details = validationErrors;
    return error;
  }

  /**
   * Middleware to handle 404 errors
   * @param {Object} req 
   * @param {Object} res 
   * @param {Function} next 
   */
  static handle404(req, res, next) {
    const error = ErrorHandler.createError(
      `Route ${req.method} ${req.originalUrl} not found`,
      'NOT_FOUND',
      404,
      { resource: req.originalUrl }
    );
    next(error);
  }

  /**
   * Async error wrapper for route handlers
   * @param {Function} fn - Async route handler function
   * @returns {Function} Wrapped function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ErrorHandler;
