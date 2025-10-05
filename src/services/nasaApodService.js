const axios = require('axios');
const { parseISO, format, isBefore, isAfter, isValid } = require('date-fns');
const config = require('../config/config');

/**
 * Service for NASA APOD (Astronomy Picture of the Day) API
 * Provides daily astronomy pictures with explanations
 */
class NasaApodService {
  constructor() {
    this.baseUrl = config.nasaApod.baseUrl;
    this.apiKey = config.nasaApod.apiKey;
    this.timeout = config.nasaApod.timeout;
    this.maxCount = config.nasaApod.maxCount;
    this.defaultThumbsEnabled = config.nasaApod.defaultThumbsEnabled;
    this.apodStartDate = '1995-06-16'; // APOD service started on June 16, 1995
  }

  /**
   * Get today's Astronomy Picture of the Day
   * @param {boolean} thumbs - Return video thumbnail URL
   * @returns {Promise<Object>} Formatted APOD data
   */
  async getToday(thumbs = false) {
    const params = {
      api_key: this.apiKey
    };

    if (thumbs) {
      params.thumbs = true;
    }

    try {
      console.log('Fetching today\'s APOD');
      
      const startTime = Date.now();
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'NASA-Weather-Data-API/1.0'
        }
      });
      
      const processingTime = Date.now() - startTime;

      if (!response.data) {
        throw this.createError(
          'INVALID_RESPONSE',
          'Invalid response format from NASA APOD API',
          502
        );
      }

      return this.formatApodResponse(response.data, processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getToday');
    }
  }

  /**
   * Get APOD for a specific date
   * @param {string} date - YYYY-MM-DD format
   * @param {boolean} thumbs - Return video thumbnail URL
   * @returns {Promise<Object>} Formatted APOD data
   */
  async getByDate(date, thumbs = false) {
    // Validate date format
    this.validateDateFormat(date);
    
    // Validate date range
    this.validateDateRange(date);

    const params = {
      api_key: this.apiKey,
      date: date
    };

    if (thumbs) {
      params.thumbs = true;
    }

    try {
      console.log(`Fetching APOD for date: ${date}`);
      
      const startTime = Date.now();
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'NASA-Weather-Data-API/1.0'
        }
      });
      
      const processingTime = Date.now() - startTime;

      if (!response.data) {
        throw this.createError(
          'INVALID_RESPONSE',
          'Invalid response format from NASA APOD API',
          502
        );
      }

      const formattedResponse = this.formatApodResponse(response.data, processingTime);
      formattedResponse.data.requestedDate = date;

      return formattedResponse;
    } catch (error) {
      throw this.handleApiError(error, 'getByDate');
    }
  }

  /**
   * Get APOD for a date range
   * @param {string} startDate - YYYY-MM-DD format
   * @param {string} endDate - YYYY-MM-DD format (optional, defaults to today)
   * @param {boolean} thumbs - Return video thumbnail URL
   * @returns {Promise<Object>} Formatted APOD data array
   */
  async getByDateRange(startDate, endDate = null, thumbs = false) {
    // Validate date formats
    this.validateDateFormat(startDate);
    
    if (endDate) {
      this.validateDateFormat(endDate);
    } else {
      endDate = format(new Date(), 'yyyy-MM-dd');
    }

    // Validate date range
    this.validateDateRange(startDate);
    this.validateDateRange(endDate);
    
    // Validate start_date is before or equal to end_date
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (isAfter(start, end)) {
      throw this.createError(
        'INVALID_DATE_RANGE',
        'Invalid date range',
        400,
        {
          startDate,
          endDate,
          issue: 'End date must be after or equal to start date'
        }
      );
    }

    const params = {
      api_key: this.apiKey,
      start_date: startDate,
      end_date: endDate
    };

    if (thumbs) {
      params.thumbs = true;
    }

    try {
      console.log(`Fetching APOD range from ${startDate} to ${endDate}`);
      
      const startTime = Date.now();
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'NASA-Weather-Data-API/1.0'
        }
      });
      
      const processingTime = Date.now() - startTime;

      if (!response.data || !Array.isArray(response.data)) {
        throw this.createError(
          'INVALID_RESPONSE',
          'Invalid response format from NASA APOD API',
          502
        );
      }

      return this.formatRangeResponse(response.data, startDate, endDate, processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getByDateRange');
    }
  }

  /**
   * Get random APOD images
   * @param {number} count - Number of random images (1-100)
   * @param {boolean} thumbs - Return video thumbnail URL
   * @returns {Promise<Object>} Formatted APOD data array
   */
  async getRandomImages(count = 1, thumbs = false) {
    // Validate count
    if (!Number.isInteger(count) || count < 1 || count > this.maxCount) {
      throw this.createError(
        'INVALID_COUNT',
        'Invalid count parameter',
        400,
        {
          provided: count,
          validRange: `1 to ${this.maxCount}`,
          message: `Count must be between 1 and ${this.maxCount}`
        }
      );
    }

    const params = {
      api_key: this.apiKey,
      count: count
    };

    if (thumbs) {
      params.thumbs = true;
    }

    try {
      console.log(`Fetching ${count} random APOD images`);
      
      const startTime = Date.now();
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'NASA-Weather-Data-API/1.0'
        }
      });
      
      const processingTime = Date.now() - startTime;

      if (!response.data || !Array.isArray(response.data)) {
        throw this.createError(
          'INVALID_RESPONSE',
          'Invalid response format from NASA APOD API',
          502
        );
      }

      return this.formatRandomResponse(response.data, count, processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getRandomImages');
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} dateString - Date string to validate
   */
  validateDateFormat(dateString) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!datePattern.test(dateString)) {
      throw this.createError(
        'INVALID_DATE_FORMAT',
        'Invalid date format',
        400,
        {
          provided: dateString,
          expected: 'YYYY-MM-DD',
          example: '2025-10-05'
        }
      );
    }

    // Validate that it's a valid date
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      throw this.createError(
        'INVALID_DATE_FORMAT',
        'Invalid date format',
        400,
        {
          provided: dateString,
          expected: 'YYYY-MM-DD',
          example: '2025-10-05',
          issue: 'Date is not valid'
        }
      );
    }
  }

  /**
   * Validate date is within valid APOD range
   * @param {string} dateString - Date string to validate
   */
  validateDateRange(dateString) {
    const date = parseISO(dateString);
    const startDate = parseISO(this.apodStartDate);
    const today = new Date();

    if (isBefore(date, startDate)) {
      throw this.createError(
        'DATE_OUT_OF_RANGE',
        'Date is outside valid range',
        400,
        {
          provided: dateString,
          validRange: `${this.apodStartDate} to today`,
          message: 'APOD started on June 16, 1995'
        }
      );
    }

    if (isAfter(date, today)) {
      throw this.createError(
        'DATE_OUT_OF_RANGE',
        'Date is outside valid range',
        400,
        {
          provided: dateString,
          validRange: `${this.apodStartDate} to today`,
          message: 'Cannot request APOD for future dates'
        }
      );
    }
  }

  /**
   * Format single APOD response
   * @param {Object} rawData - Raw NASA APOD data
   * @param {number} processingTime - Processing time in ms
   * @returns {Object} Formatted response
   */
  formatApodResponse(rawData, processingTime) {
    const formattedData = {
      source: 'NASA APOD API',
      date: rawData.date,
      title: rawData.title,
      explanation: rawData.explanation,
      mediaType: rawData.media_type,
      url: rawData.url,
      serviceVersion: rawData.service_version || 'v1'
    };

    // Add HD URL for images
    if (rawData.hdurl) {
      formattedData.hdurl = rawData.hdurl;
    }

    // Add copyright if present
    if (rawData.copyright) {
      formattedData.copyright = rawData.copyright.trim();
    }

    // Add thumbnail URL for videos
    if (rawData.thumbnail_url) {
      formattedData.thumbnailUrl = rawData.thumbnail_url;
    }

    return {
      success: true,
      data: formattedData,
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Format date range response
   * @param {Array} rawData - Array of raw NASA APOD data
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {number} processingTime - Processing time in ms
   * @returns {Object} Formatted response
   */
  formatRangeResponse(rawData, startDate, endDate, processingTime) {
    const images = rawData.map(item => {
      const formattedData = {
        date: item.date,
        title: item.title,
        explanation: item.explanation,
        mediaType: item.media_type,
        url: item.url,
        serviceVersion: item.service_version || 'v1'
      };

      if (item.hdurl) {
        formattedData.hdurl = item.hdurl;
      }

      if (item.copyright) {
        formattedData.copyright = item.copyright.trim();
      }

      if (item.thumbnail_url) {
        formattedData.thumbnailUrl = item.thumbnail_url;
      }

      return formattedData;
    });

    // Calculate summary statistics
    const mediaTypeCounts = images.reduce((acc, img) => {
      acc[img.mediaType] = (acc[img.mediaType] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        source: 'NASA APOD API',
        dateRange: {
          startDate,
          endDate
        },
        totalImages: images.length,
        images,
        summary: {
          totalImages: images.length,
          byMediaType: mediaTypeCounts
        }
      },
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Format random images response
   * @param {Array} rawData - Array of raw NASA APOD data
   * @param {number} count - Requested count
   * @param {number} processingTime - Processing time in ms
   * @returns {Object} Formatted response
   */
  formatRandomResponse(rawData, count, processingTime) {
    const images = rawData.map(item => {
      const formattedData = {
        date: item.date,
        title: item.title,
        explanation: item.explanation,
        mediaType: item.media_type,
        url: item.url,
        serviceVersion: item.service_version || 'v1'
      };

      if (item.hdurl) {
        formattedData.hdurl = item.hdurl;
      }

      if (item.copyright) {
        formattedData.copyright = item.copyright.trim();
      }

      if (item.thumbnail_url) {
        formattedData.thumbnailUrl = item.thumbnail_url;
      }

      return formattedData;
    });

    // Calculate summary statistics
    const mediaTypeCounts = images.reduce((acc, img) => {
      acc[img.mediaType] = (acc[img.mediaType] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        source: 'NASA APOD API',
        requestedCount: count,
        actualCount: images.length,
        images,
        summary: {
          totalImages: images.length,
          byMediaType: mediaTypeCounts
        }
      },
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Test connectivity to NASA APOD API
   * @returns {Promise<Object>} Connection status
   */
  async testConnectivity() {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'NASA-Weather-Data-API/1.0'
        }
      });

      return {
        status: 'connected',
        message: 'NASA APOD API is accessible',
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      return {
        status: 'disconnected',
        message: error.message || 'Could not connect to NASA APOD API'
      };
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @param {string} method - Method name where error occurred
   * @returns {Error} Formatted error
   */
  handleApiError(error, method) {
    console.error(`NASA APOD API error in ${method}:`, error.message);

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Rate limit exceeded
      if (status === 429) {
        return this.createError(
          'NASA_APOD_RATE_LIMIT',
          'NASA APOD API rate limit exceeded',
          429,
          {
            limit: '1000 requests per hour',
            retryAfter: 3600
          }
        );
      }

      // Bad request
      if (status === 400) {
        return this.createError(
          'INVALID_REQUEST',
          data.msg || 'Invalid request to NASA APOD API',
          400,
          {
            upstreamError: data.msg || 'Bad request'
          }
        );
      }

      // Service unavailable
      if (status >= 500) {
        return this.createError(
          'NASA_APOD_UNAVAILABLE',
          'NASA APOD API is temporarily unavailable',
          502,
          {
            upstreamError: data.msg || 'Service unavailable',
            retryAfter: 300
          }
        );
      }

      return this.createError(
        'NASA_APOD_ERROR',
        data.msg || 'Error from NASA APOD API',
        status,
        {
          upstreamError: data.msg || error.message
        }
      );
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return this.createError(
        'NASA_APOD_TIMEOUT',
        'Request to NASA APOD API timed out',
        504,
        {
          timeout: this.timeout
        }
      );
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'NASA_APOD_UNAVAILABLE',
        'Cannot connect to NASA APOD API',
        503,
        {
          error: error.message
        }
      );
    }

    // Handle custom errors (already formatted)
    if (error.code && error.statusCode) {
      return error;
    }

    // Handle unknown errors
    return this.createError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      500,
      {
        error: error.message
      }
    );
  }

  /**
   * Create formatted error object
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional error details
   * @returns {Error} Formatted error
   */
  createError(code, message, statusCode, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}

module.exports = NasaApodService;
