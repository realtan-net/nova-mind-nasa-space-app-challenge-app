const express = require('express');
const router = express.Router();
const NasaEpicService = require('../services/nasaEpicService');

// Initialize service
const epicService = new NasaEpicService();

/**
 * @route GET /api/epic/natural/images
 * @desc Get latest natural color Earth images
 * @access Public
 */
router.get('/natural/images', async (req, res, next) => {
  try {
    const result = await epicService.getNaturalImages();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/epic/natural/images/date/:date
 * @desc Get natural color images by date
 * @param {string} date - Date in YYYY-MM-DD format
 * @access Public
 */
router.get('/natural/images/date/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const result = await epicService.getNaturalImagesByDate(date);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/epic/natural/dates
 * @desc Get all available dates for natural color imagery
 * @access Public
 */
router.get('/natural/dates', async (req, res, next) => {
  try {
    const result = await epicService.getNaturalAvailableDates();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/epic/enhanced/images
 * @desc Get latest enhanced color Earth images
 * @access Public
 */
router.get('/enhanced/images', async (req, res, next) => {
  try {
    const result = await epicService.getEnhancedImages();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/epic/enhanced/images/date/:date
 * @desc Get enhanced color images by date
 * @param {string} date - Date in YYYY-MM-DD format
 * @access Public
 */
router.get('/enhanced/images/date/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const result = await epicService.getEnhancedImagesByDate(date);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/epic/enhanced/dates
 * @desc Get all available dates for enhanced color imagery
 * @access Public
 */
router.get('/enhanced/dates', async (req, res, next) => {
  try {
    const result = await epicService.getEnhancedAvailableDates();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
