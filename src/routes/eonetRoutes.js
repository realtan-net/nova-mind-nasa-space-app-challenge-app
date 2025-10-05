const express = require('express');
const router = express.Router();
const NasaEonetService = require('../services/nasaEonetService');

const eonetService = new NasaEonetService();

/**
 * GET /api/eonet/categories
 * Get all event categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const result = await eonetService.getCategories();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/eonet/events
 * Get general events with optional filters
 */
router.get('/events', async (req, res, next) => {
  try {
    const { status, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);

    const result = await eonetService.getEvents(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/eonet/events/geojson
 * Get events in GeoJSON format
 */
router.get('/events/geojson', async (req, res, next) => {
  try {
    const { status, category, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (limit) filters.limit = parseInt(limit);

    const result = await eonetService.getEventsGeoJSON(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/eonet/events/category/:categoryId
 * Get category-specific events
 */
router.get('/events/category/:categoryId', async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { status, limit } = req.query;

    const filters = {
      category: categoryId
    };
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);

    const result = await eonetService.getEvents(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/eonet/events/regional
 * Get regional events with bbox and optional proximity analysis
 */
router.get('/events/regional', async (req, res, next) => {
  try {
    const { bbox, userLat, userLon, status, limit } = req.query;

    if (!bbox) {
      const error = new Error('Bounding box (bbox) is required');
      error.code = 'BBOX_REQUIRED';
      error.statusCode = 400;
      throw error;
    }

    const filters = {
      bbox
    };
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    if (userLat) filters.userLat = userLat;
    if (userLon) filters.userLon = userLon;

    const result = await eonetService.getEvents(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/eonet/events/analysis
 * Get events with trend analysis
 */
router.get('/events/analysis', async (req, res, next) => {
  try {
    const { category, start, end, limit } = req.query;

    if (!category) {
      const error = new Error('Category is required for trend analysis');
      error.code = 'CATEGORY_REQUIRED';
      error.statusCode = 400;
      throw error;
    }

    if (!start || !end) {
      const error = new Error('Start and end dates are required for trend analysis');
      error.code = 'DATE_RANGE_REQUIRED';
      error.statusCode = 400;
      throw error;
    }

    const filters = {
      category,
      start,
      end
    };
    if (limit) filters.limit = parseInt(limit);

    const result = await eonetService.getEvents(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/eonet/events/:eventId
 * Get specific event by ID
 */
router.get('/events/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await eonetService.getEventById(eventId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
