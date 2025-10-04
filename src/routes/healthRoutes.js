const express = require('express');
const WeatherController = require('../controllers/weatherController');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();
const weatherController = new WeatherController();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: API health check
 *     description: Returns API status and NASA POWER API connectivity status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 services:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "operational"
 *                         responseTime:
 *                           type: integer
 *                     nasaPowerApi:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "operational"
 *                         message:
 *                           type: string
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *       503:
 *         description: API is unhealthy
 */
router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
  await weatherController.healthCheck(req, res);
}));

module.exports = router;
