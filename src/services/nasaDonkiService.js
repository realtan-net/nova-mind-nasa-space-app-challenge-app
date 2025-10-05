const axios = require('axios');
const { parseISO, format, subDays } = require('date-fns');
const config = require('../config/config');

/**
 * Service for NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information) API
 * Provides geomagnetic storm data from NASA's DONKI system
 */
class NasaDonkiService {
  constructor() {
    this.baseUrl = config.nasaApi.donkiBaseUrl;
    this.apiKey = config.nasaApi.apiKey;
    this.timeout = config.nasaApi.timeout;
  }

  /**
   * Fetch Geomagnetic Storm (GST) data from NASA DONKI
   * @param {string} startDate - YYYY-MM-DD format (default: 30 days ago)
   * @param {string} endDate - YYYY-MM-DD format (default: current date)
   * @returns {Promise<Object>} Formatted geomagnetic storm data
   */
  async getGeomagneticStorms(startDate, endDate) {
    // Set default dates if not provided
    const now = new Date();
    const defaultEndDate = format(now, 'yyyy-MM-dd');
    const defaultStartDate = format(subDays(now, 30), 'yyyy-MM-dd');

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    // Validate API key
    if (!this.apiKey) {
      throw this.createError('NASA_API_KEY_INVALID', 'NASA API key is not configured', 401);
    }

    const url = `${this.baseUrl}/GST`;
    const params = {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      api_key: this.apiKey
    };

    try {
      console.log(`Fetching NASA DONKI GST data from ${effectiveStartDate} to ${effectiveEndDate}`);
      
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
      return this.formatGstResponse(response.data, effectiveStartDate, effectiveEndDate, processingTime);
    } catch (error) {
      console.error('NASA DONKI API request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Format GST response data
   * @param {Array} rawData - Raw data from NASA DONKI API
   * @param {string} startDate 
   * @param {string} endDate 
   * @param {number} processingTime 
   * @returns {Object} Formatted response
   */
  formatGstResponse(rawData, startDate, endDate, processingTime) {
    // Ensure rawData is an array
    const storms = Array.isArray(rawData) ? rawData : [];

    // Calculate storm statistics
    const stormStats = this.calculateStormStatistics(storms);

    return {
      success: true,
      data: {
        source: 'NASA DONKI GST',
        dateRange: {
          startDate,
          endDate
        },
        storms: storms.map(storm => this.formatStormData(storm)),
        totalCount: storms.length,
        statistics: stormStats
      },
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Format individual storm data
   * @param {Object} storm - Raw storm data
   * @returns {Object} Formatted storm data
   */
  formatStormData(storm) {
    return {
      gstID: storm.gstID || null,
      startTime: storm.startTime || null,
      allKpIndex: storm.allKpIndex || [],
      linkedEvents: storm.linkedEvents || [],
      link: storm.link || null,
      submissionTime: storm.submissionTime || null,
      versionId: storm.versionId || null,
      sentNotifications: storm.sentNotifications || []
    };
  }

  /**
   * Calculate storm statistics
   * @param {Array} storms 
   * @returns {Object} Statistics
   */
  calculateStormStatistics(storms) {
    if (!storms || storms.length === 0) {
      return {
        maxKpIndex: 0,
        averageKpIndex: 0,
        totalKpObservations: 0,
        stormsWithMultipleKp: 0
      };
    }

    let maxKp = 0;
    let totalKp = 0;
    let totalObservations = 0;
    let stormsWithMultipleKp = 0;

    storms.forEach(storm => {
      if (storm.allKpIndex && storm.allKpIndex.length > 0) {
        storm.allKpIndex.forEach(kpData => {
          if (kpData.kpIndex > maxKp) {
            maxKp = kpData.kpIndex;
          }
          totalKp += kpData.kpIndex;
          totalObservations++;
        });

        if (storm.allKpIndex.length > 1) {
          stormsWithMultipleKp++;
        }
      }
    });

    return {
      maxKpIndex: maxKp,
      averageKpIndex: totalObservations > 0 ? (totalKp / totalObservations).toFixed(2) : 0,
      totalKpObservations: totalObservations,
      stormsWithMultipleKp
    };
  }

  /**
   * Test connectivity to NASA DONKI API
   * @returns {Promise<Object>} Connection status
   */
  async testConnectivity() {
    try {
      const testDate = format(new Date(), 'yyyy-MM-dd');
      const url = `${this.baseUrl}/GST`;
      const params = {
        startDate: testDate,
        endDate: testDate,
        api_key: this.apiKey
      };

      await axios.get(url, {
        params,
        timeout: 5000
      });

      return {
        status: 'connected',
        message: 'NASA DONKI API is accessible',
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
   * Handle API errors
   * @param {Error} error 
   * @returns {Error} Formatted error
   */
  handleApiError(error) {
    if (error.response) {
      // API responded with error status
      const statusCode = error.response.status;
      const message = error.response.data?.message || error.message;

      if (statusCode === 401 || statusCode === 403) {
        return this.createError('NASA_API_KEY_INVALID', 'Invalid or missing NASA API key', statusCode);
      } else if (statusCode === 429) {
        return this.createError('NASA_API_RATE_LIMIT', 'NASA API rate limit exceeded', statusCode);
      } else if (statusCode >= 500) {
        return this.createError('NASA_DONKI_UNAVAILABLE', 'NASA DONKI service is temporarily unavailable', statusCode);
      } else {
        return this.createError('NASA_API_ERROR', message, statusCode);
      }
    } else if (error.request) {
      // Request was made but no response received
      return this.createError('NASA_DONKI_UNAVAILABLE', 'Unable to reach NASA DONKI service', 503);
    } else {
      // Something else happened
      return this.createError('NASA_API_ERROR', error.message, 500);
    }
  }

  /**
   * Create formatted error object
   * @param {string} code 
   * @param {string} message 
   * @param {number} statusCode 
   * @returns {Error} Error object with additional properties
   */
  createError(code, message, statusCode) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
  }
}

module.exports = NasaDonkiService;
