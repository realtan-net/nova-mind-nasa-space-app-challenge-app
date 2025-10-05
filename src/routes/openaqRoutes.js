const express = require('express');
const router = express.Router();
const OpenaqService = require('../services/openaqService');

const openaqService = new OpenaqService();

/**
 * GET /api/openaq/stations
 * Find air quality monitoring stations by coordinates
 */
router.get('/stations', async (req, res, next) => {
  try {
    const { coordinates, radius, limit } = req.query;

    // Validate required parameters
    if (!coordinates) {
      const error = new Error('coordinates parameter is required (format: lat,lon)');
      error.code = 'MISSING_COORDINATES';
      error.statusCode = 400;
      return next(error);
    }

    // Parse coordinates
    const coords = coordinates.split(',');
    if (coords.length !== 2) {
      const error = new Error('coordinates must be in format: lat,lon');
      error.code = 'INVALID_COORDINATES_FORMAT';
      error.statusCode = 400;
      return next(error);
    }

    const lat = parseFloat(coords[0].trim());
    const lon = parseFloat(coords[1].trim());

    // Parse optional parameters
    const searchRadius = radius ? parseInt(radius) : undefined;
    const searchLimit = limit ? parseInt(limit) : undefined;

    const result = await openaqService.findStations(lat, lon, searchRadius, searchLimit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/openaq/measurements/:sensorId
 * Get latest measurements for a specific sensor
 */
router.get('/measurements/:sensorId', async (req, res, next) => {
  try {
    const { sensorId } = req.params;

    if (!sensorId) {
      const error = new Error('sensorId parameter is required');
      error.code = 'MISSING_SENSOR_ID';
      error.statusCode = 400;
      return next(error);
    }

    const result = await openaqService.getSensorMeasurements(parseInt(sensorId));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/openaq/airquality
 * Get comprehensive air quality assessment for a location
 */
router.get('/airquality', async (req, res, next) => {
  try {
    const { coordinates, radius, limit } = req.query;

    // Validate required parameters
    if (!coordinates) {
      const error = new Error('coordinates parameter is required (format: lat,lon)');
      error.code = 'MISSING_COORDINATES';
      error.statusCode = 400;
      return next(error);
    }

    // Parse coordinates
    const coords = coordinates.split(',');
    if (coords.length !== 2) {
      const error = new Error('coordinates must be in format: lat,lon');
      error.code = 'INVALID_COORDINATES_FORMAT';
      error.statusCode = 400;
      return next(error);
    }

    const lat = parseFloat(coords[0].trim());
    const lon = parseFloat(coords[1].trim());

    // Parse optional parameters
    const searchRadius = radius ? parseInt(radius) : undefined;
    const searchLimit = limit ? parseInt(limit) : undefined;

    const result = await openaqService.getAirQuality(lat, lon, searchRadius, searchLimit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
