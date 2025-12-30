const { parseISO, isFuture } = require("date-fns");
const ValidationService = require("../services/validationService");
const NasaPowerApiService = require("../services/nasaApiService");
const WeatherDataService = require("../services/weatherDataService");
const ErrorHandler = require("../middleware/errorHandler");

class WeatherController {
  constructor() {
    this.nasaApiService = new NasaPowerApiService();
    this.weatherDataService = new WeatherDataService();
  }

  /**
   * Get weather data for specific location and date
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWeatherData(req, res) {
    const requestStartTime = Date.now();

    try {
      // Validate request parameters
      const validation = ValidationService.validateWeatherRequest(req.query);

      if (!validation.isValid) {
        throw ErrorHandler.createValidationErrorWithDetails(validation.errors);
      }

      const { latitude, longitude, date, parameters, historicalYears, format } =
        validation.data;
      const parameterList = parameters.split(",");

      console.log(
        `Processing weather request for [${latitude}, ${longitude}] on ${date}`
      );

      let weatherData;
      const requestDate = parseISO(date);

      // NASA POWER API has a configurable data delay (default: 4 days)
      // Calculate cutoff date: today minus delay days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nasaDataCutoff = new Date(today);
      const delayDays = require("../config/config").weather.nasaDataDelayDays;
      nasaDataCutoff.setDate(nasaDataCutoff.getDate() - delayDays);

      if (requestDate < nasaDataCutoff) {
        // Date is older than 4 days - fetch actual NASA historical data
        console.log(
          "Historical date detected (older than 4 days), fetching actual data..."
        );
        weatherData = await this.fetchHistoricalData(
          latitude,
          longitude,
          date,
          parameterList
        );
      } else {
        // Date is within last 4 days, today, or future - generate prediction
        console.log(
          "Date within NASA data delay window or future, generating prediction..."
        );
        weatherData = await this.generatePrediction(
          latitude,
          longitude,
          date,
          parameterList,
          historicalYears
        );
      }

      const processingTime = Date.now() - requestStartTime;

      // Format response based on requested format
      if (format === "csv") {
        const csvData = this.weatherDataService.convertToCSV(weatherData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="weather_${date}_${latitude}_${longitude}.csv"`
        );
        return res.send(csvData);
      }

      // JSON response
      res.json({
        success: true,
        data: weatherData,
        requestTimestamp: new Date().toISOString(),
        processingTime,
      });
    } catch (error) {
      console.error("Weather data request failed:", error.message);
      throw error;
    }
  }

  /**
   * Fetch historical weather data
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} date
   * @param {Array<string>} parameters
   * @returns {Object} Processed weather data
   */
  async fetchHistoricalData(latitude, longitude, date, parameters) {
    try {
      const nasaResponse = await this.nasaApiService.fetchWeatherData(
        latitude,
        longitude,
        date,
        date,
        parameters
      );

      return this.weatherDataService.processWeatherData(
        nasaResponse,
        date,
        "historical"
      );
    } catch (error) {
      console.error("Failed to fetch historical data:", error.message);
      throw error;
    }
  }

  /**
   * Generate weather prediction for future date
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} targetDate
   * @param {Array<string>} parameters
   * @param {number} historicalYears
   * @returns {Object} Processed prediction data
   */
  async generatePrediction(
    latitude,
    longitude,
    targetDate,
    parameters,
    historicalYears
  ) {
    try {
      // Fetch historical data for the same date across multiple years
      const historicalDataArray =
        await this.nasaApiService.fetchHistoricalDataForPrediction(
          latitude,
          longitude,
          targetDate,
          historicalYears,
          parameters
        );

      // Calculate prediction using arithmetic mean
      const { prediction, metadata } =
        this.weatherDataService.calculatePrediction(
          historicalDataArray,
          targetDate,
          parameters
        );

      // Process the prediction data
      return this.weatherDataService.processWeatherData(
        prediction,
        targetDate,
        "prediction",
        metadata
      );
    } catch (error) {
      console.error("Failed to generate prediction:", error.message);
      throw error;
    }
  }

  /**
   * Get available weather parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWeatherParameters(req, res) {
    try {
      const parameters = ValidationService.getParameterInfo();
      const validParameters = ValidationService.getValidParameters();

      res.json({
        success: true,
        data: {
          availableParameters: validParameters,
          parameterDetails: parameters,
          defaultParameters:
            require("../config/config").weather.defaultParameters,
          maxParametersPerRequest:
            require("../config/config").weather.maxParametersPerRequest,
        },
        requestTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to get weather parameters:", error.message);
      throw error;
    }
  }

  /**
   * Get historical data range for a location
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistoricalRange(req, res) {
    try {
      // Validate location parameters
      const validation = ValidationService.validateLocation(req.query);

      if (!validation.isValid) {
        throw ErrorHandler.createValidationErrorWithDetails(validation.errors);
      }

      const { latitude, longitude } = validation.data;
      const config = require("../config/config");

      res.json({
        success: true,
        data: {
          location: { latitude, longitude },
          historicalRange: {
            startDate: config.validation.minDate,
            endDate: new Date().toISOString().split("T")[0],
          },
          predictionRange: {
            startDate: new Date(Date.now() + 86400000)
              .toISOString()
              .split("T")[0], // Tomorrow
            endDate: new Date(
              Date.now() + config.validation.maxFutureYears * 365 * 86400000
            )
              .toISOString()
              .split("T")[0],
          },
        },
        requestTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to get historical range:", error.message);
      throw error;
    }
  }

  /**
   * Handle bulk weather data requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBulkWeatherData(req, res) {
    const requestStartTime = Date.now();

    try {
      // Validate bulk request
      const validation = ValidationService.validateBulkRequest(req.body);

      if (!validation.isValid) {
        throw ErrorHandler.createValidationErrorWithDetails(validation.errors);
      }

      const { requests, historicalYears } = validation.data;
      console.log(`Processing bulk request with ${requests.length} locations`);

      // Process all requests in parallel
      const promises = requests.map(async (request, index) => {
        try {
          const { latitude, longitude, date, parameters } = request;
          const parameterList = parameters
            ? parameters.split(",")
            : require("../config/config").weather.defaultParameters;

          const requestDate = parseISO(date);
          let weatherData;

          // NASA POWER API has a configurable data delay (default: 4 days)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nasaDataCutoff = new Date(today);
          const delayDays =
            require("../config/config").weather.nasaDataDelayDays;
          nasaDataCutoff.setDate(nasaDataCutoff.getDate() - delayDays);

          if (requestDate < nasaDataCutoff) {
            // Date is older than 4 days - fetch actual NASA historical data
            weatherData = await this.fetchHistoricalData(
              latitude,
              longitude,
              date,
              parameterList
            );
          } else {
            // Date is within last 4 days, today, or future - generate prediction
            weatherData = await this.generatePrediction(
              latitude,
              longitude,
              date,
              parameterList,
              historicalYears
            );
          }

          return {
            index,
            success: true,
            data: weatherData,
          };
        } catch (error) {
          console.error(`Bulk request ${index} failed:`, error.message);
          return {
            index,
            success: false,
            error: {
              code: error.code || "PROCESSING_ERROR",
              message: error.message,
            },
          };
        }
      });

      const results = await Promise.all(promises);
      const processingTime = Date.now() - requestStartTime;

      // Separate successful and failed results
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      res.json({
        success: true,
        data: {
          totalRequests: requests.length,
          successfulRequests: successful.length,
          failedRequests: failed.length,
          results: successful.map((r) => r.data),
          errors: failed.map((r) => ({ index: r.index, error: r.error })),
        },
        requestTimestamp: new Date().toISOString(),
        processingTime,
      });
    } catch (error) {
      console.error("Bulk weather data request failed:", error.message);
      throw error;
    }
  }

  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async healthCheck(req, res) {
    try {
      const startTime = Date.now();

      // Test NASA API connectivity
      const nasaStatus = await this.nasaApiService.testConnectivity();

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        services: {
          api: {
            status: "operational",
            responseTime: responseTime,
          },
          nasaPowerApi: {
            status:
              nasaStatus.status === "connected" ? "operational" : "degraded",
            message: nasaStatus.message,
            error: nasaStatus.error || null,
          },
        },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      console.error("Health check failed:", error.message);
      res.status(503).json({
        success: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: error.message,
        },
      });
    }
  }
}

module.exports = WeatherController;
