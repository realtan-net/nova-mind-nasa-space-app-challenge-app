const express = require('express');
const router = express.Router();
const NasaNeowsService = require('../services/nasaNeowsService');

// Lazy-load service (instantiate on first use to ensure config is loaded)
let nasaNeowsService;

function getNasaNeowsService() {
  if (!nasaNeowsService) {
    nasaNeowsService = new NasaNeowsService();
  }
  return nasaNeowsService;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString 
 * @returns {boolean}
 */
function isValidDateFormat(dateString) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    return false;
  }
  
  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * GET /api/asteroids/feed
 * Retrieve a list of Asteroids based on their closest approach date to Earth
 * Query parameters:
 *   - start_date: YYYY-MM-DD (required) - Starting date for asteroid search
 *   - end_date: YYYY-MM-DD (optional) - Ending date for asteroid search (defaults to 7 days after start_date)
 */
router.get('/feed', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    // Validate start_date is provided
    if (!start_date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'start_date parameter is required',
          details: {
            field: 'start_date',
            expected: 'YYYY-MM-DD'
          }
        },
        requestTimestamp: new Date().toISOString()
      });
    }

    // Validate start_date format
    if (!isValidDateFormat(start_date)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid date format provided',
          details: {
            field: 'start_date',
            provided: start_date,
            expected: 'YYYY-MM-DD'
          }
        },
        requestTimestamp: new Date().toISOString()
      });
    }

    // Validate end_date format if provided
    if (end_date && !isValidDateFormat(end_date)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid date format provided',
          details: {
            field: 'end_date',
            provided: end_date,
            expected: 'YYYY-MM-DD'
          }
        },
        requestTimestamp: new Date().toISOString()
      });
    }

    // Call the service
    const result = await getNasaNeowsService().getAsteroidFeed(start_date, end_date);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
