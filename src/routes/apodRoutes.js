const express = require('express');
const router = express.Router();
const NasaApodService = require('../services/nasaApodService');

const apodService = new NasaApodService();

/**
 * GET /api/apod
 * Get today's Astronomy Picture of the Day
 */
router.get('/', async (req, res, next) => {
  try {
    const { thumbs } = req.query;
    
    // Convert thumbs to boolean
    const thumbsEnabled = thumbs === 'true' || thumbs === '1';

    const result = await apodService.getToday(thumbsEnabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/apod/date/:date
 * Get APOD for a specific date
 */
router.get('/date/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const { thumbs } = req.query;
    
    // Convert thumbs to boolean
    const thumbsEnabled = thumbs === 'true' || thumbs === '1';

    const result = await apodService.getByDate(date, thumbsEnabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/apod/range
 * Get APOD for a date range
 */
router.get('/range', async (req, res, next) => {
  try {
    const { start_date, end_date, thumbs } = req.query;

    // Validate required parameters
    if (!start_date) {
      const error = new Error('Missing required parameter: start_date');
      error.code = 'MISSING_PARAMETER';
      error.statusCode = 400;
      error.details = {
        parameter: 'start_date',
        message: 'start_date parameter is required',
        format: 'YYYY-MM-DD'
      };
      return next(error);
    }

    // Convert thumbs to boolean
    const thumbsEnabled = thumbs === 'true' || thumbs === '1';

    const result = await apodService.getByDateRange(start_date, end_date, thumbsEnabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/apod/random
 * Get random APOD images
 */
router.get('/random', async (req, res, next) => {
  try {
    const { count, thumbs } = req.query;

    // Parse count parameter
    const imageCount = count ? parseInt(count, 10) : 1;

    // Convert thumbs to boolean
    const thumbsEnabled = thumbs === 'true' || thumbs === '1';

    const result = await apodService.getRandomImages(imageCount, thumbsEnabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
