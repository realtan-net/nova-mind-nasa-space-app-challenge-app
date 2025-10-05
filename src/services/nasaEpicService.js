const axios = require('axios');
const { parseISO, format } = require('date-fns');
const config = require('../config/config');

/**
 * Service for NASA EPIC (Earth Polychromatic Imaging Camera) API
 * Provides full-disk Earth imagery from the DSCOVR spacecraft
 */
class NasaEpicService {
  constructor() {
    this.baseUrl = config.nasaEpic.baseUrl;
    this.archiveUrl = config.nasaEpic.archiveUrl;
    this.apiKey = config.nasaEpic.apiKey;
    this.timeout = config.nasaEpic.timeout;
    this.imageTypes = config.nasaEpic.imageTypes;
  }

  /**
   * Get most recent natural color imagery metadata
   * @returns {Promise<Object>} Formatted image data
   */
  async getNaturalImages() {
    const url = `${this.baseUrl}/natural/images`;
    const params = {
      api_key: this.apiKey
    };

    try {
      console.log('Fetching latest natural color EPIC images');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
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
          'Invalid response format from NASA EPIC API',
          502
        );
      }

      return this.formatImagesResponse(response.data, 'natural', processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getNaturalImages');
    }
  }

  /**
   * Get natural color imagery metadata for a specific date
   * @param {string} date - YYYY-MM-DD format
   * @returns {Promise<Object>} Formatted image data
   */
  async getNaturalImagesByDate(date) {
    // Validate date format
    this.validateDateFormat(date);

    const url = `${this.baseUrl}/natural/date/${date}`;
    const params = {
      api_key: this.apiKey
    };

    try {
      console.log(`Fetching natural color EPIC images for date: ${date}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
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
          'Invalid response format from NASA EPIC API',
          502
        );
      }

      if (response.data.length === 0) {
        throw this.createError(
          'NO_IMAGES_FOUND',
          'No images found for the specified date',
          404,
          {
            requestedDate: date,
            imageType: 'natural',
            suggestion: 'Try another date or check available dates endpoint'
          }
        );
      }

      return this.formatImagesResponse(response.data, 'natural', processingTime, date);
    } catch (error) {
      throw this.handleApiError(error, 'getNaturalImagesByDate');
    }
  }

  /**
   * Get all dates with available natural color imagery
   * @returns {Promise<Object>} List of available dates
   */
  async getNaturalAvailableDates() {
    const url = `${this.baseUrl}/natural/all`;
    const params = {
      api_key: this.apiKey
    };

    try {
      console.log('Fetching all available dates for natural color imagery');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
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
          'Invalid response format from NASA EPIC API',
          502
        );
      }

      return this.formatDatesResponse(response.data, 'natural', processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getNaturalAvailableDates');
    }
  }

  /**
   * Get most recent enhanced color imagery metadata
   * @returns {Promise<Object>} Formatted image data
   */
  async getEnhancedImages() {
    const url = `${this.baseUrl}/enhanced/images`;
    const params = {
      api_key: this.apiKey
    };

    try {
      console.log('Fetching latest enhanced color EPIC images');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
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
          'Invalid response format from NASA EPIC API',
          502
        );
      }

      return this.formatImagesResponse(response.data, 'enhanced', processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getEnhancedImages');
    }
  }

  /**
   * Get enhanced color imagery metadata for a specific date
   * @param {string} date - YYYY-MM-DD format
   * @returns {Promise<Object>} Formatted image data
   */
  async getEnhancedImagesByDate(date) {
    // Validate date format
    this.validateDateFormat(date);

    const url = `${this.baseUrl}/enhanced/date/${date}`;
    const params = {
      api_key: this.apiKey
    };

    try {
      console.log(`Fetching enhanced color EPIC images for date: ${date}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
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
          'Invalid response format from NASA EPIC API',
          502
        );
      }

      if (response.data.length === 0) {
        throw this.createError(
          'NO_IMAGES_FOUND',
          'No images found for the specified date',
          404,
          {
            requestedDate: date,
            imageType: 'enhanced',
            suggestion: 'Try another date or check available dates endpoint'
          }
        );
      }

      return this.formatImagesResponse(response.data, 'enhanced', processingTime, date);
    } catch (error) {
      throw this.handleApiError(error, 'getEnhancedImagesByDate');
    }
  }

  /**
   * Get all dates with available enhanced color imagery
   * @returns {Promise<Object>} List of available dates
   */
  async getEnhancedAvailableDates() {
    const url = `${this.baseUrl}/enhanced/all`;
    const params = {
      api_key: this.apiKey
    };

    try {
      console.log('Fetching all available dates for enhanced color imagery');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
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
          'Invalid response format from NASA EPIC API',
          502
        );
      }

      return this.formatDatesResponse(response.data, 'enhanced', processingTime);
    } catch (error) {
      throw this.handleApiError(error, 'getEnhancedAvailableDates');
    }
  }

  /**
   * Generate image download URL
   * @param {string} imageType - 'natural' or 'enhanced'
   * @param {string} date - Date string from API (e.g., "2025-10-05 01:13:59")
   * @param {string} imageName - Image name without extension
   * @param {string} format - 'png' or 'jpg'
   * @returns {string} Full download URL
   */
  generateImageUrl(imageType, date, imageName, format = 'png') {
    const { year, month, day } = this.parseDateForUrl(date);
    return `${this.archiveUrl}/${imageType}/${year}/${month}/${day}/${format}/${imageName}.${format}?api_key=${this.apiKey}`;
  }

  /**
   * Parse date string to extract YYYY/MM/DD
   * @param {string} dateString - Date string (e.g., "2025-10-05 01:13:59" or "2025-10-05")
   * @returns {Object} Object with year, month, day
   */
  parseDateForUrl(dateString) {
    // Handle both formats: "2025-10-05 01:13:59" and "2025-10-05"
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-');
    
    return { year, month, day };
  }

  /**
   * Format image metadata with download URLs
   * @param {Array} imageData - Raw API data
   * @param {string} imageType - 'natural' or 'enhanced'
   * @param {number} processingTime - Processing time in milliseconds
   * @param {string} requestedDate - Optional requested date
   * @returns {Object} Formatted response
   */
  formatImagesResponse(imageData, imageType, processingTime, requestedDate = null) {
    const images = imageData.map(item => this.formatImageMetadata(item, imageType));

    const response = {
      success: true,
      data: {
        source: 'NASA EPIC API',
        imageType: imageType,
        totalImages: images.length,
        images: images
      },
      requestTimestamp: new Date().toISOString(),
      processingTime: processingTime
    };

    if (requestedDate) {
      response.data.requestedDate = requestedDate;
    }

    return response;
  }

  /**
   * Format dates response
   * @param {Array} datesData - Raw API data
   * @param {string} imageType - 'natural' or 'enhanced'
   * @param {number} processingTime - Processing time in milliseconds
   * @returns {Object} Formatted response
   */
  formatDatesResponse(datesData, imageType, processingTime) {
    const dates = datesData.map(item => item.date);
    
    // Determine date range
    const sortedDates = [...dates].sort();
    const earliest = sortedDates[0];
    const latest = sortedDates[sortedDates.length - 1];

    return {
      success: true,
      data: {
        source: 'NASA EPIC API',
        imageType: imageType,
        totalDates: dates.length,
        dateRange: {
          earliest: earliest,
          latest: latest
        },
        dates: dates
      },
      requestTimestamp: new Date().toISOString(),
      processingTime: processingTime
    };
  }

  /**
   * Format single image metadata
   * @param {Object} imageData - Raw image data from API
   * @param {string} imageType - 'natural' or 'enhanced'
   * @returns {Object} Formatted image metadata
   */
  formatImageMetadata(imageData, imageType) {
    const formattedImage = {
      identifier: imageData.identifier,
      imageName: imageData.image,
      caption: imageData.caption,
      version: imageData.version,
      date: imageData.date,
      downloadUrl: this.generateImageUrl(imageType, imageData.date, imageData.image, 'png'),
      thumbnailUrl: this.generateImageUrl(imageType, imageData.date, imageData.image, 'jpg'),
      centroidCoordinates: {
        latitude: imageData.centroid_coordinates?.lat || 0,
        longitude: imageData.centroid_coordinates?.lon || 0
      }
    };

    // Add spacecraft position data if available
    if (imageData.dscovr_j2000_position || imageData.lunar_j2000_position || imageData.sun_j2000_position) {
      formattedImage.spacecraftPosition = {};

      if (imageData.dscovr_j2000_position) {
        formattedImage.spacecraftPosition.dscovr = {
          x: imageData.dscovr_j2000_position.x,
          y: imageData.dscovr_j2000_position.y,
          z: imageData.dscovr_j2000_position.z
        };
      }

      if (imageData.lunar_j2000_position) {
        formattedImage.spacecraftPosition.lunar = {
          x: imageData.lunar_j2000_position.x,
          y: imageData.lunar_j2000_position.y,
          z: imageData.lunar_j2000_position.z
        };
      }

      if (imageData.sun_j2000_position) {
        formattedImage.spacecraftPosition.sun = {
          x: imageData.sun_j2000_position.x,
          y: imageData.sun_j2000_position.y,
          z: imageData.sun_j2000_position.z
        };
      }
    }

    // Add attitude quaternions if available
    if (imageData.attitude_quaternions) {
      formattedImage.attitudeQuaternions = {
        q0: imageData.attitude_quaternions.q0,
        q1: imageData.attitude_quaternions.q1,
        q2: imageData.attitude_quaternions.q2,
        q3: imageData.attitude_quaternions.q3
      };
    }

    return formattedImage;
  }

  /**
   * Validate date format
   * @param {string} date - Date string to validate
   * @throws {Error} If date format is invalid
   */
  validateDateFormat(date) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!datePattern.test(date)) {
      throw this.createError(
        'INVALID_DATE_FORMAT',
        'Invalid date format',
        400,
        {
          provided: date,
          expected: 'YYYY-MM-DD',
          example: '2025-10-05'
        }
      );
    }

    // Validate that it's a valid date
    try {
      const parsedDate = parseISO(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      throw this.createError(
        'INVALID_DATE_FORMAT',
        'Invalid date value',
        400,
        {
          provided: date,
          expected: 'Valid date in YYYY-MM-DD format',
          example: '2025-10-05'
        }
      );
    }
  }

  /**
   * Handle API errors and transform them into standardized format
   * @param {Error} error - Original error
   * @param {string} context - Context where error occurred
   * @returns {Error} Formatted error
   */
  handleApiError(error, context) {
    console.error(`NASA EPIC API Error in ${context}:`, error.message);

    // If it's already our custom error, rethrow it
    if (error.code && error.statusCode) {
      return error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      
      if (status === 429) {
        return this.createError(
          'NASA_EPIC_RATE_LIMIT',
          'NASA EPIC API rate limit exceeded',
          429,
          {
            limit: '1000 requests per hour',
            retryAfter: 3600
          }
        );
      }

      if (status === 404) {
        return this.createError(
          'NO_IMAGES_FOUND',
          'No images found for the specified parameters',
          404,
          {
            suggestion: 'Try another date or check available dates endpoint'
          }
        );
      }

      if (status >= 500) {
        return this.createError(
          'NASA_EPIC_UNAVAILABLE',
          'NASA EPIC API is temporarily unavailable',
          502,
          {
            upstreamError: error.message,
            retryAfter: 300
          }
        );
      }

      return this.createError(
        'NASA_EPIC_ERROR',
        `NASA EPIC API error: ${error.message}`,
        status
      );
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return this.createError(
        'NASA_EPIC_TIMEOUT',
        'Request to NASA EPIC API timed out',
        504,
        {
          retryAfter: 60
        }
      );
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'NASA_EPIC_UNAVAILABLE',
        'Cannot connect to NASA EPIC API',
        503,
        {
          upstreamError: error.code,
          retryAfter: 300
        }
      );
    }

    // Generic error
    return this.createError(
      'NASA_EPIC_ERROR',
      `NASA EPIC API error: ${error.message}`,
      500
    );
  }

  /**
   * Create standardized error object
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

  /**
   * Test connectivity to NASA EPIC API
   * @returns {Promise<Object>} Status object
   */
  async testConnectivity() {
    try {
      const url = `${this.baseUrl}/natural/images`;
      const params = {
        api_key: this.apiKey
      };

      await axios.get(url, {
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'NASA-Weather-Data-API/1.0'
        }
      });

      return {
        status: 'connected',
        message: 'NASA EPIC API is accessible',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'disconnected',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = NasaEpicService;
