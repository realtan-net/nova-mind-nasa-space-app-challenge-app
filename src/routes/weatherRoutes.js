const express = require("express");
const router = express.Router();
const WeatherController = require("../controllers/weatherController");
const ErrorHandler = require("../middleware/errorHandler");
const authMiddleware = require("../middleware/authMiddleware"); // 1. Import Auth

const weatherController = new WeatherController();

/**
 * @swagger
 * /api/weather/data:
 * get:
 * summary: Get weather data for specific location and date
 * description: Returns historical weather data or predictions. Requires Authentication.
 * security:
 * - bearerAuth: []
 * tags: [Weather Data]
 * parameters:
 * - in: query
 * name: latitude
 * required: true
 * schema:
 * type: number
 * - in: query
 * name: longitude
 * required: true
 * schema:
 * type: number
 * - in: query
 * name: date
 * required: true
 * schema:
 * type: string
 * format: date
 * - in: query
 * name: parameters
 * required: false
 * schema:
 * type: string
 * - in: query
 * name: historicalYears
 * required: false
 * schema:
 * type: integer
 * - in: query
 * name: format
 * required: false
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Successfully retrieved weather data
 * 401:
 * description: Unauthorized (Missing or Invalid Token)
 * 400:
 * description: Invalid request parameters
 * 502:
 * description: External API error
 */
// 🔒 PROTECTED: Added authMiddleware before the handler
router.get(
  "/data",
  authMiddleware,
  ErrorHandler.asyncHandler(async (req, res) => {
    await weatherController.getWeatherData(req, res);
  })
);

/**
 * @swagger
 * /api/weather/parameters:
 * get:
 * summary: Get available weather parameters
 * description: Returns list of available weather parameters. (Public)
 * tags: [Weather Parameters]
 * responses:
 * 200:
 * description: Successfully retrieved parameter information
 */
// 🔓 PUBLIC: No authMiddleware here
router.get(
  "/parameters",
  ErrorHandler.asyncHandler(async (req, res) => {
    await weatherController.getWeatherParameters(req, res);
  })
);

/**
 * @swagger
 * /api/weather/historical-range:
 * get:
 * summary: Get available historical data range for location
 * description: Returns date range. Requires Authentication.
 * security:
 * - bearerAuth: []
 * tags: [Weather Data]
 * parameters:
 * - in: query
 * name: latitude
 * required: true
 * schema:
 * type: number
 * - in: query
 * name: longitude
 * required: true
 * schema:
 * type: number
 * responses:
 * 200:
 * description: Successfully retrieved date range
 * 401:
 * description: Unauthorized
 * 400:
 * description: Invalid coordinates
 */
// 🔒 PROTECTED: Added authMiddleware
router.get(
  "/historical-range",
  authMiddleware,
  ErrorHandler.asyncHandler(async (req, res) => {
    await weatherController.getHistoricalRange(req, res);
  })
);

/**
 * @swagger
 * /api/weather/bulk:
 * post:
 * summary: Get weather data for multiple locations
 * description: Process multiple requests. Requires Authentication.
 * security:
 * - bearerAuth: []
 * tags: [Weather Data]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * requests:
 * type: array
 * items:
 * type: object
 * historicalYears:
 * type: integer
 * responses:
 * 200:
 * description: Bulk request processed successfully
 * 401:
 * description: Unauthorized
 * 400:
 * description: Invalid bulk request format
 */
// 🔒 PROTECTED: Added authMiddleware
router.post(
  "/bulk",
  authMiddleware,
  ErrorHandler.asyncHandler(async (req, res) => {
    await weatherController.getBulkWeatherData(req, res);
  })
);

module.exports = router;
