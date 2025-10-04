const Joi = require('joi');
const { isValid, parseISO, addYears, isFuture, isPast } = require('date-fns');
const config = require('../config/config');

class ValidationService {
  
  // Weather data request validation schema
  static getWeatherDataSchema() {
    return Joi.object({
      latitude: Joi.number()
        .min(config.validation.minLatitude)
        .max(config.validation.maxLatitude)
        .required()
        .messages({
          'number.base': 'Latitude must be a number',
          'number.min': `Latitude must be between ${config.validation.minLatitude} and ${config.validation.maxLatitude}`,
          'number.max': `Latitude must be between ${config.validation.minLatitude} and ${config.validation.maxLatitude}`,
          'any.required': 'Latitude is required'
        }),
      
      longitude: Joi.number()
        .min(config.validation.minLongitude)
        .max(config.validation.maxLongitude)
        .required()
        .messages({
          'number.base': 'Longitude must be a number',
          'number.min': `Longitude must be between ${config.validation.minLongitude} and ${config.validation.maxLongitude}`,
          'number.max': `Longitude must be between ${config.validation.minLongitude} and ${config.validation.maxLongitude}`,
          'any.required': 'Longitude is required'
        }),
      
      date: Joi.string()
        .required()
        .custom((value, helpers) => {
          // First try to normalize the date format (handle single-digit month/day)
          let normalizedDate = value;
          
          // Check if it matches flexible pattern YYYY-M-D or YYYY-MM-DD etc.
          const flexiblePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
          const match = value.match(flexiblePattern);
          
          if (match) {
            const [, year, month, day] = match;
            normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            // If it doesn't match the flexible pattern, check strict pattern
            if (!config.validation.datePattern.test(value)) {
              return helpers.error('date.format');
            }
          }
          
          // Validate the normalized date
          if (!isValid(parseISO(normalizedDate))) {
            return helpers.error('date.invalid');
          }
          
          const inputDate = parseISO(normalizedDate);
          const minDate = parseISO(config.validation.minDate);
          const maxDate = addYears(new Date(), config.validation.maxFutureYears);
          
          if (inputDate < minDate || inputDate > maxDate) {
            return helpers.error('date.range');
          }
          
          return normalizedDate;
        })
        .messages({
          'date.format': 'Date must be in YYYY-MM-DD format (e.g., 2025-10-03 or 2025-1-1)',
          'date.invalid': 'Invalid date provided (e.g., February 30th does not exist)',
          'date.range': `Date must be between ${config.validation.minDate} and ${addYears(new Date(), config.validation.maxFutureYears).toISOString().split('T')[0]}`,
          'any.required': 'Date is required'
        }),
      
      parameters: Joi.string()
        .optional()
        .custom((value, helpers) => {
          if (!value) return config.weather.defaultParameters.join(',');
          
          const params = value.split(',').map(p => p.trim()).filter(Boolean);
          const uniqueParams = [...new Set(params)];
          
          if (uniqueParams.length > config.weather.maxParametersPerRequest) {
            return helpers.error('parameters.tooMany');
          }
          
          const validParams = this.getValidParameters();
          const invalidParams = uniqueParams.filter(p => !validParams.includes(p));
          
          if (invalidParams.length > 0) {
            return helpers.error('parameters.invalid', { invalidParams });
          }
          
          return uniqueParams.join(',');
        })
        .messages({
          'parameters.tooMany': `Maximum ${config.weather.maxParametersPerRequest} parameters allowed`,
          'parameters.invalid': 'Invalid parameters: {{#invalidParams}}'
        }),
      
      historicalYears: Joi.number()
        .integer()
        .min(config.weather.minHistoricalYears)
        .max(config.weather.maxHistoricalYears)
        .optional()
        .default(config.weather.defaultHistoricalYears)
        .messages({
          'number.base': 'Historical years must be a number',
          'number.integer': 'Historical years must be an integer',
          'number.min': `Historical years must be at least ${config.weather.minHistoricalYears}`,
          'number.max': `Historical years must be at most ${config.weather.maxHistoricalYears}`
        }),
      
      format: Joi.string()
        .valid('json', 'csv')
        .optional()
        .default('json')
        .messages({
          'any.only': 'Format must be either json or csv'
        })
    });
  }

  // Bulk request validation schema
  static getBulkRequestSchema() {
    return Joi.object({
      requests: Joi.array()
        .items(Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
          date: Joi.string().pattern(config.validation.datePattern).required(),
          parameters: Joi.string().optional()
        }))
        .min(1)
        .max(10)
        .required()
        .messages({
          'array.min': 'At least one request is required',
          'array.max': 'Maximum 10 requests allowed in bulk operation'
        }),
      
      historicalYears: Joi.number()
        .integer()
        .min(config.weather.minHistoricalYears)
        .max(config.weather.maxHistoricalYears)
        .optional()
        .default(config.weather.defaultHistoricalYears)
    });
  }

  // Location validation schema
  static getLocationSchema() {
    return Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    });
  }

  // Get list of valid weather parameters
  static getValidParameters() {
    return [
      'T2M', 'RH2M', 'WS10M', 'WD10M', 'PS', 'ALLSKY_SFC_SW_DWN',
      'PRECTOTCORR', 'T2MDEW', 'CLRSKY_SFC_SW_DWN', 'ALLSKY_SFC_LW_DWN',
      'T2M_MAX', 'T2M_MIN', 'T2M_RANGE', 'WS2M', 'WS50M',
      'ALLSKY_TOA_SW_DWN', 'CLRSKY_SFC_LW_DWN'
    ];
  }

  // Parameter descriptions and units
  static getParameterInfo() {
    return {
      'T2M': { units: 'C', longname: 'Temperature at 2 Meters' },
      'RH2M': { units: '%', longname: 'Relative Humidity at 2 Meters' },
      'WS10M': { units: 'm/s', longname: 'Wind Speed at 10 Meters' },
      'WD10M': { units: 'Degrees', longname: 'Wind Direction at 10 Meters' },
      'PS': { units: 'kPa', longname: 'Surface Pressure' },
      'ALLSKY_SFC_SW_DWN': { units: 'MJ/hr', longname: 'All Sky Surface Shortwave Downward Irradiance' },
      'PRECTOTCORR': { units: 'mm/day', longname: 'Precipitation Corrected' },
      'T2MDEW': { units: 'C', longname: 'Dew Point Temperature at 2 Meters' },
      'CLRSKY_SFC_SW_DWN': { units: 'MJ/hr', longname: 'Clear Sky Surface Shortwave Downward Irradiance' },
      'ALLSKY_SFC_LW_DWN': { units: 'MJ/hr', longname: 'All Sky Surface Longwave Downward Irradiance' }
    };
  }

  // Validate and normalize request data
  static validateWeatherRequest(data) {
    const schema = this.getWeatherDataSchema();
    const { error, value } = schema.validate(data);
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        provided: detail.context?.value
      }));
      
      return {
        isValid: false,
        errors: details,
        data: null
      };
    }
    
    return {
      isValid: true,
      errors: null,
      data: value
    };
  }

  // Validate bulk request
  static validateBulkRequest(data) {
    const schema = this.getBulkRequestSchema();
    const { error, value } = schema.validate(data);
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        provided: detail.context?.value
      }));
      
      return {
        isValid: false,
        errors: details,
        data: null
      };
    }
    
    return {
      isValid: true,
      errors: null,
      data: value
    };
  }

  // Validate location coordinates
  static validateLocation(data) {
    const schema = this.getLocationSchema();
    const { error, value } = schema.validate(data);
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        provided: detail.context?.value
      }));
      
      return {
        isValid: false,
        errors: details,
        data: null
      };
    }
    
    return {
      isValid: true,
      errors: null,
      data: value
    };
  }
}

module.exports = ValidationService;
