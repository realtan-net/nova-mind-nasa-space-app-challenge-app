const express = require('express');
const WeatherController = require('../controllers/weatherController');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();
const weatherController = new WeatherController();

/**
 * @swagger
 * /api/weather/data:
 *   get:
 *     summary: Get weather data for specific location and date
 *     description: Returns historical weather data for past dates or predictions for future dates based on historical averages
 *     tags: [Weather Data]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate in decimal degrees
 *         example: 41.0
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate in decimal degrees
 *         example: 29.0
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *         example: "2025-09-30"
 *       - in: query
 *         name: parameters
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of weather parameters
 *         example: "T2M,RH2M,WS10M"
 *       - in: query
 *         name: historicalYears
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 5
 *           maximum: 30
 *           default: 20
 *         description: Number of historical years to use for future predictions
 *         example: 20
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Response format
 *         example: "json"
 *     responses:
 *       200:
 *         description: Successfully retrieved weather data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                 requestTimestamp:
 *                   type: string
 *                   format: date-time
 *                 processingTime:
 *                   type: integer
 *       400:
 *         description: Invalid request parameters
 *       502:
 *         description: External API error
 */
router.get('/data', ErrorHandler.asyncHandler(async (req, res) => {
  await weatherController.getWeatherData(req, res);
}));

/**
 * @swagger
 * /api/weather/parameters:
 *   get:
 *     summary: Get available weather parameters
 *     description: Returns list of available weather parameters with their descriptions and units
 *     tags: [Weather Parameters]
 *     responses:
 *       200:
 *         description: Successfully retrieved parameter information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableParameters:
 *                       type: array
 *                       items:
 *                         type: string
 *                     parameterDetails:
 *                       type: object
 *                     defaultParameters:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/parameters', ErrorHandler.asyncHandler(async (req, res) => {
  await weatherController.getWeatherParameters(req, res);
}));

/**
 * @swagger
 * /api/weather/historical-range:
 *   get:
 *     summary: Get available historical data range for location
 *     description: Returns the available date range for historical and prediction data at given coordinates
 *     tags: [Weather Data]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate in decimal degrees
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate in decimal degrees
 *     responses:
 *       200:
 *         description: Successfully retrieved date range information
 *       400:
 *         description: Invalid coordinates
 */
router.get('/historical-range', ErrorHandler.asyncHandler(async (req, res) => {
  await weatherController.getHistoricalRange(req, res);
}));

/**
 * @swagger
 * /api/weather/bulk:
 *   post:
 *     summary: Get weather data for multiple locations
 *     description: Process multiple weather data requests in a single API call
 *     tags: [Weather Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       format: float
 *                     longitude:
 *                       type: number
 *                       format: float
 *                     date:
 *                       type: string
 *                       format: date
 *                     parameters:
 *                       type: string
 *               historicalYears:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 30
 *     responses:
 *       200:
 *         description: Bulk request processed successfully
 *       400:
 *         description: Invalid bulk request format
 */
router.post('/bulk', ErrorHandler.asyncHandler(async (req, res) => {
  await weatherController.getBulkWeatherData(req, res);
}));

module.exports = router;
