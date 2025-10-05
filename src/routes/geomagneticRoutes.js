const express = require('express');
const router = express.Router();
const NasaDonkiService = require('../services/nasaDonkiService');
const NoaaSwpcService = require('../services/noaaSwpcService');

// Lazy-load services (instantiate on first use to ensure config is loaded)
let nasaDonkiService;
let noaaSwpcService;

function getNasaDonkiService() {
  if (!nasaDonkiService) {
    nasaDonkiService = new NasaDonkiService();
  }
  return nasaDonkiService;
}

function getNoaaSwpcService() {
  if (!noaaSwpcService) {
    noaaSwpcService = new NoaaSwpcService();
  }
  return noaaSwpcService;
}

/**
 * GET /api/geomagnetic/storms
 * Get geomagnetic storm data from NASA DONKI
 * Query parameters:
 *   - startDate: YYYY-MM-DD (optional, default: 30 days ago)
 *   - endDate: YYYY-MM-DD (optional, default: current date)
 */
router.get('/storms', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date format if provided
    if (startDate && !isValidDateFormat(startDate)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DATE_RANGE_INVALID',
          message: 'Invalid startDate format. Expected YYYY-MM-DD',
          details: { startDate }
        },
        requestTimestamp: new Date().toISOString()
      });
    }

    if (endDate && !isValidDateFormat(endDate)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DATE_RANGE_INVALID',
          message: 'Invalid endDate format. Expected YYYY-MM-DD',
          details: { endDate }
        },
        requestTimestamp: new Date().toISOString()
      });
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DATE_RANGE_INVALID',
          message: 'startDate must be before or equal to endDate',
          details: { startDate, endDate }
        },
        requestTimestamp: new Date().toISOString()
      });
    }

    const result = await getNasaDonkiService().getGeomagneticStorms(startDate, endDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/geomagnetic/forecast/3-day
 * Get 3-day geomagnetic forecast from NOAA SWPC
 */
router.get('/forecast/3-day', async (req, res, next) => {
  try {
    const result = await getNoaaSwpcService().get3DayGeomagForecast();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/geomagnetic/forecast/27-day
 * Get 27-day geomagnetic outlook from NOAA SWPC
 */
router.get('/forecast/27-day', async (req, res, next) => {
  try {
    const result = await getNoaaSwpcService().get27DayOutlook();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/geomagnetic/forecast/combined
 * Get combined forecast data (3-day + 27-day)
 */
router.get('/forecast/combined', async (req, res, next) => {
  try {
    const result = await getNoaaSwpcService().getCombinedForecast();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to validate date format (YYYY-MM-DD)
 * @param {string} dateString 
 * @returns {boolean}
 */
function isValidDateFormat(dateString) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

module.exports = router;
