require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const config = require('./config/config');
const weatherRoutes = require('./routes/weatherRoutes');
const healthRoutes = require('./routes/healthRoutes');
const ErrorHandler = require('./middleware/errorHandler');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupSwagger();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Allow Swagger UI to work
    }));

    // Compression middleware
    this.app.use(compression());

    // CORS middleware
    this.app.use(cors({
      origin: config.cors.origin,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders,
      credentials: false
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests, please try again later.',
          details: {
            retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
          }
        },
        requestTimestamp: new Date().toISOString()
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      type: 'application/json'
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Request logging middleware (development only)
    if (config.server.env === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
        if (Object.keys(req.query).length > 0) {
          console.log('Query params:', req.query);
        }
        if (req.method === 'POST' && req.body) {
          console.log('Request body:', JSON.stringify(req.body, null, 2));
        }
        next();
      });
    }

    // Request timeout middleware
    this.app.use((req, res, next) => {
      res.setTimeout(config.server.timeout, () => {
        const error = new Error('Request timeout');
        error.code = 'REQUEST_TIMEOUT';
        error.statusCode = 408;
        next(error);
      });
      next();
    });
  }

  setupRoutes() {
    // API Routes
    this.app.use('/api/weather', weatherRoutes);
    this.app.use('/api/health', healthRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'NASA Weather Data API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
          weather: '/api/weather/data',
          parameters: '/api/weather/parameters',
          historicalRange: '/api/weather/historical-range',
          bulk: '/api/weather/bulk',
          health: '/api/health'
        },
        timestamp: new Date().toISOString()
      });
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        api: 'NASA Weather Data API',
        version: '1.0.0',
        description: 'Weather data and prediction service using NASA POWER API',
        documentation: '/api-docs',
        contact: 'NASA Space Apps Challenge Team',
        endpoints: [
          'GET /api/weather/data - Get weather data for location and date',
          'GET /api/weather/parameters - Get available parameters',
          'GET /api/weather/historical-range - Get data range for location',
          'POST /api/weather/bulk - Bulk weather data requests',
          'GET /api/health - Health check'
        ],
        timestamp: new Date().toISOString()
      });
    });
  }

  setupSwagger() {
    try {
      // Load OpenAPI specification
      const swaggerDocument = YAML.load(path.join(__dirname, '../docs/api-spec.yaml'));
      
      // Update server URLs based on environment
      if (config.server.env === 'production') {
        swaggerDocument.servers = [
          {
            url: 'https://nasa-weather-api.example.com/api',
            description: 'Production server'
          }
        ];
      } else {
        swaggerDocument.servers = [
          {
            url: `http://localhost:${config.server.port}/api`,
            description: 'Development server'
          }
        ];
      }

      // Swagger UI options
      const options = {
        explorer: true,
        swaggerOptions: {
          docExpansion: 'tag',
          filter: true,
          showRequestDuration: true
        },
        customSiteTitle: 'NASA Weather API Documentation',
        customCss: `
          .topbar-wrapper .link { 
            content: url('https://power.larc.nasa.gov/docs/logo.png'); 
            height: 40px; 
          }
          .swagger-ui .topbar { background-color: #1b365d; }
        `
      };

      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
      
      // API specification endpoint
      this.app.get('/api-spec', (req, res) => {
        res.json(swaggerDocument);
      });

      console.log('✓ Swagger documentation available at /api-docs');
    } catch (error) {
      console.warn('⚠ Warning: Could not load Swagger documentation:', error.message);
    }
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(ErrorHandler.handle404);

    // Global error handler
    this.app.use(ErrorHandler.handleError);

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      process.exit(0);
    });

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise Rejection:', reason);
      console.error('Promise:', promise);
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  start() {
    const port = config.server.port;
    
    this.app.listen(port, () => {
      console.log('🚀 NASA Weather Data API Server Started');
      console.log('='.repeat(50));
      console.log(`📡 Server running on port ${port}`);
      console.log(`🌍 Environment: ${config.server.env}`);
      console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
      console.log(`🌤️  Weather Data: http://localhost:${port}/api/weather/data`);
      console.log('='.repeat(50));
      
      // Test NASA API connection on startup
      this.testNasaConnection();
    });
  }

  async testNasaConnection() {
    try {
      const NasaPowerApiService = require('./services/nasaApiService');
      const nasaService = new NasaPowerApiService();
      const status = await nasaService.testConnectivity();
      
      if (status.status === 'connected') {
        console.log('✓ NASA POWER API connection test successful');
      } else {
        console.warn('⚠ NASA POWER API connection test failed:', status.message);
      }
    } catch (error) {
      console.warn('⚠ Could not test NASA API connection:', error.message);
    }
  }

  getApp() {
    return this.app;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const app = new App();
  app.start();
}

module.exports = App;
