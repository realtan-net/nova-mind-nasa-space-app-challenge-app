const axios = require('axios');
const { parseISO, format, addDays, differenceInDays } = require('date-fns');
const config = require('../config/config');

/**
 * Service for NASA NeoWs (Near Earth Object Web Service) API
 * Provides asteroid data based on their closest approach date to Earth
 */
class NasaNeowsService {
  constructor() {
    this.baseUrl = config.nasaNeows.baseUrl;
    this.apiKey = config.nasaNeows.apiKey;
    this.timeout = config.nasaNeows.timeout;
    this.defaultDateRange = config.nasaNeows.defaultDateRange;
  }

  /**
   * Get asteroid feed data by closest approach date
   * @param {string} startDate - YYYY-MM-DD format
   * @param {string} endDate - YYYY-MM-DD format (optional, defaults to 7 days after start_date)
   * @returns {Promise<Object>} Formatted asteroid data
   */
  async getAsteroidFeed(startDate, endDate) {
    // Validate API key
    if (!this.apiKey) {
      throw this.createError('NASA_API_KEY_INVALID', 'NASA API key is not configured', 401);
    }

    // If end_date is not provided, default to 7 days after start_date
    let effectiveEndDate = endDate;
    if (!effectiveEndDate) {
      const startDateObj = parseISO(startDate);
      effectiveEndDate = format(addDays(startDateObj, this.defaultDateRange), 'yyyy-MM-dd');
    }

    // Validate date range (max 7 days)
    const startDateObj = parseISO(startDate);
    const endDateObj = parseISO(effectiveEndDate);
    const daysDifference = differenceInDays(endDateObj, startDateObj);

    if (daysDifference > 7) {
      throw this.createError(
        'DATE_RANGE_EXCEEDED',
        'Date range cannot exceed 7 days',
        400,
        {
          startDate,
          endDate: effectiveEndDate,
          maxDays: 7
        }
      );
    }

    if (daysDifference < 0) {
      throw this.createError(
        'DATE_RANGE_INVALID',
        'End date must be after or equal to start date',
        400,
        {
          startDate,
          endDate: effectiveEndDate
        }
      );
    }

    const url = `${this.baseUrl}/feed`;
    const params = {
      start_date: startDate,
      end_date: effectiveEndDate,
      api_key: this.apiKey
    };

    try {
      console.log(`Fetching NASA NeoWs data from ${startDate} to ${effectiveEndDate}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      // Format the response
      return this.formatAsteroidResponse(response.data, startDate, effectiveEndDate, processingTime);
    } catch (error) {
      console.error('NASA NeoWs API request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Format asteroid feed response data
   * @param {Object} rawData - Raw data from NASA NeoWs API
   * @param {string} startDate 
   * @param {string} endDate 
   * @param {number} processingTime 
   * @returns {Object} Formatted response
   */
  formatAsteroidResponse(rawData, startDate, endDate, processingTime) {
    const asteroidsByDate = {};
    const allAsteroids = [];

    // Transform near_earth_objects structure
    if (rawData.near_earth_objects) {
      Object.keys(rawData.near_earth_objects).forEach(date => {
        const asteroidsForDate = rawData.near_earth_objects[date];
        asteroidsByDate[date] = asteroidsForDate.map(asteroid => {
          const formatted = this.formatAsteroidData(asteroid);
          allAsteroids.push(formatted);
          return formatted;
        });
      });
    }

    // Calculate summary statistics
    const summary = this.calculateStatistics(allAsteroids, rawData);

    // Extract pagination links
    const pagination = {
      next: rawData.links?.next || null,
      previous: rawData.links?.previous || null,
      self: rawData.links?.self || null
    };

    return {
      success: true,
      data: {
        source: 'NASA NeoWs API',
        dateRange: {
          startDate,
          endDate
        },
        elementCount: rawData.element_count || 0,
        asteroidsByDate,
        summary,
        pagination
      },
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Format individual asteroid data
   * @param {Object} asteroid - Raw asteroid data
   * @returns {Object} Formatted asteroid data
   */
  formatAsteroidData(asteroid) {
    // Get the first close approach data (there's usually only one)
    const closeApproach = asteroid.close_approach_data?.[0] || {};

    return {
      id: asteroid.id || null,
      neoReferenceId: asteroid.neo_reference_id || null,
      name: asteroid.name || null,
      nasaJplUrl: asteroid.nasa_jpl_url || null,
      absoluteMagnitude: asteroid.absolute_magnitude_h || null,
      estimatedDiameter: {
        kilometers: {
          min: asteroid.estimated_diameter?.kilometers?.estimated_diameter_min || 0,
          max: asteroid.estimated_diameter?.kilometers?.estimated_diameter_max || 0
        },
        meters: {
          min: asteroid.estimated_diameter?.meters?.estimated_diameter_min || 0,
          max: asteroid.estimated_diameter?.meters?.estimated_diameter_max || 0
        },
        miles: {
          min: asteroid.estimated_diameter?.miles?.estimated_diameter_min || 0,
          max: asteroid.estimated_diameter?.miles?.estimated_diameter_max || 0
        },
        feet: {
          min: asteroid.estimated_diameter?.feet?.estimated_diameter_min || 0,
          max: asteroid.estimated_diameter?.feet?.estimated_diameter_max || 0
        }
      },
      isPotentiallyHazardous: asteroid.is_potentially_hazardous_asteroid || false,
      closeApproachData: {
        date: closeApproach.close_approach_date || null,
        dateFull: closeApproach.close_approach_date_full || null,
        epochDate: closeApproach.epoch_date_close_approach || null,
        relativeVelocity: {
          kilometersPerSecond: parseFloat(closeApproach.relative_velocity?.kilometers_per_second) || 0,
          kilometersPerHour: parseFloat(closeApproach.relative_velocity?.kilometers_per_hour) || 0,
          milesPerHour: parseFloat(closeApproach.relative_velocity?.miles_per_hour) || 0
        },
        missDistance: {
          astronomical: parseFloat(closeApproach.miss_distance?.astronomical) || 0,
          lunar: parseFloat(closeApproach.miss_distance?.lunar) || 0,
          kilometers: parseFloat(closeApproach.miss_distance?.kilometers) || 0,
          miles: parseFloat(closeApproach.miss_distance?.miles) || 0
        },
        orbitingBody: closeApproach.orbiting_body || 'Earth'
      },
      isSentryObject: asteroid.is_sentry_object || false
    };
  }

  /**
   * Calculate summary statistics for asteroid data
   * @param {Array} asteroids - Array of formatted asteroid objects
   * @param {Object} rawData - Original raw data for reference
   * @returns {Object} Summary statistics
   */
  calculateStatistics(asteroids, rawData) {
    if (!asteroids || asteroids.length === 0) {
      return {
        totalAsteroids: 0,
        potentiallyHazardous: 0,
        sentryObjects: 0
      };
    }

    const potentiallyHazardous = asteroids.filter(a => a.isPotentiallyHazardous).length;
    const sentryObjects = asteroids.filter(a => a.isSentryObject).length;

    // Find closest approach
    const closestAsteroid = asteroids.reduce((closest, current) => {
      if (!closest || current.closeApproachData.missDistance.kilometers < closest.closeApproachData.missDistance.kilometers) {
        return current;
      }
      return closest;
    }, null);

    // Find largest asteroid (by max diameter)
    const largestAsteroid = asteroids.reduce((largest, current) => {
      if (!largest || current.estimatedDiameter.kilometers.max > largest.estimatedDiameter.kilometers.max) {
        return current;
      }
      return largest;
    }, null);

    // Find fastest asteroid
    const fastestAsteroid = asteroids.reduce((fastest, current) => {
      if (!fastest || current.closeApproachData.relativeVelocity.kilometersPerHour > fastest.closeApproachData.relativeVelocity.kilometersPerHour) {
        return current;
      }
      return fastest;
    }, null);

    return {
      totalAsteroids: asteroids.length,
      potentiallyHazardous,
      sentryObjects,
      closestApproach: closestAsteroid ? {
        asteroidId: closestAsteroid.id,
        name: closestAsteroid.name,
        distance: {
          kilometers: closestAsteroid.closeApproachData.missDistance.kilometers,
          miles: closestAsteroid.closeApproachData.missDistance.miles
        },
        date: closestAsteroid.closeApproachData.date
      } : null,
      largestAsteroid: largestAsteroid ? {
        asteroidId: largestAsteroid.id,
        name: largestAsteroid.name,
        diameter: {
          kilometersMax: largestAsteroid.estimatedDiameter.kilometers.max,
          milesMax: largestAsteroid.estimatedDiameter.miles.max
        }
      } : null,
      fastestAsteroid: fastestAsteroid ? {
        asteroidId: fastestAsteroid.id,
        name: fastestAsteroid.name,
        velocity: {
          kilometersPerHour: fastestAsteroid.closeApproachData.relativeVelocity.kilometersPerHour,
          milesPerHour: fastestAsteroid.closeApproachData.relativeVelocity.milesPerHour
        }
      } : null
    };
  }

  /**
   * Test connectivity to NASA NeoWs API
   * @returns {Promise<Object>} Status object
   */
  async testConnectivity() {
    try {
      // Use a simple feed request with a single day to test
      const testDate = format(new Date(), 'yyyy-MM-dd');
      const url = `${this.baseUrl}/feed`;
      const params = {
        start_date: testDate,
        end_date: testDate,
        api_key: this.apiKey
      };

      await axios.get(url, {
        params,
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return {
        status: 'connected',
        message: 'NASA NeoWs API is accessible',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create standardized error object
   * @param {string} code 
   * @param {string} message 
   * @param {number} statusCode 
   * @param {Object} details 
   * @returns {Error}
   */
  createError(code, message, statusCode = 500, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  /**
   * Handle API errors
   * @param {Error} error 
   * @returns {Error}
   */
  handleApiError(error) {
    if (error.response) {
      // API responded with error status
      const statusCode = error.response.status;
      const data = error.response.data;

      if (statusCode === 429) {
        return this.createError(
          'NASA_NEOWS_RATE_LIMIT',
          'NASA NeoWs API rate limit exceeded',
          429,
          { retryAfter: error.response.headers['retry-after'] || 3600 }
        );
      }

      if (statusCode === 401 || statusCode === 403) {
        return this.createError(
          'NASA_NEOWS_UNAUTHORIZED',
          'Invalid or missing NASA API key',
          statusCode,
          data
        );
      }

      if (statusCode >= 500) {
        return this.createError(
          'NASA_NEOWS_UNAVAILABLE',
          'NASA NeoWs API is temporarily unavailable',
          502,
          { upstreamError: data.error || 'Service error', retryAfter: 300 }
        );
      }

      return this.createError(
        'NASA_NEOWS_ERROR',
        data.error_message || 'NASA NeoWs API request failed',
        statusCode,
        data
      );
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return this.createError(
        'NASA_NEOWS_TIMEOUT',
        'NASA NeoWs API request timed out',
        504,
        { timeout: this.timeout }
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'NASA_NEOWS_UNAVAILABLE',
        'Cannot connect to NASA NeoWs API',
        503,
        { originalError: error.message }
      );
    }

    // Return the error as-is if it's already formatted
    if (error.code && error.statusCode) {
      return error;
    }

    // Generic error
    return this.createError(
      'NASA_NEOWS_ERROR',
      error.message || 'Failed to retrieve asteroid data',
      500
    );
  }
}

module.exports = NasaNeowsService;
