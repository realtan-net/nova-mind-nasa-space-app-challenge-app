require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
// const rateLimit = require('express-rate-limit'); // Rate limiting removed as per requirements
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const config = require('./config/config');
const weatherRoutes = require('./routes/weatherRoutes');
const healthRoutes = require('./routes/healthRoutes');
const geomagneticRoutes = require('./routes/geomagneticRoutes');
const asteroidRoutes = require('./routes/asteroidRoutes');
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

    // Rate limiting removed as per requirements
    // Previously had rate limiting here, but removed for this implementation

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
    this.app.use('/api/geomagnetic', geomagneticRoutes);
    this.app.use('/api/asteroids', asteroidRoutes);

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
          geomagneticStorms: '/api/geomagnetic/storms',
          forecast3Day: '/api/geomagnetic/forecast/3-day',
          forecast27Day: '/api/geomagnetic/forecast/27-day',
          forecastCombined: '/api/geomagnetic/forecast/combined',
          asteroidFeed: '/api/asteroids/feed',
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
        description: 'Weather data and prediction service using NASA POWER API and geomagnetic storm data',
        documentation: '/api-docs',
        contact: 'NASA Space Apps Challenge Team',
        endpoints: [
          'GET /api/weather/data - Get weather data for location and date',
          'GET /api/weather/parameters - Get available parameters',
          'GET /api/weather/historical-range - Get data range for location',
          'POST /api/weather/bulk - Bulk weather data requests',
          'GET /api/geomagnetic/storms - Get geomagnetic storm data (NASA DONKI)',
          'GET /api/geomagnetic/forecast/3-day - Get 3-day geomagnetic forecast (NOAA SWPC)',
          'GET /api/geomagnetic/forecast/27-day - Get 27-day geomagnetic outlook (NOAA SWPC)',
          'GET /api/geomagnetic/forecast/combined - Get combined forecast data',
          'GET /api/asteroids/feed - Get asteroid data by closest approach date',
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
      // Test NASA POWER API
      const NasaPowerApiService = require('./services/nasaApiService');
      const nasaService = new NasaPowerApiService();
      const powerStatus = await nasaService.testConnectivity();
      
      if (powerStatus.status === 'connected') {
        console.log('✓ NASA POWER API connection test successful');
      } else {
        console.warn('⚠ NASA POWER API connection test failed:', powerStatus.message);
      }

      // Test NASA DONKI API
      const NasaDonkiService = require('./services/nasaDonkiService');
      const donkiService = new NasaDonkiService();
      const donkiStatus = await donkiService.testConnectivity();
      
      if (donkiStatus.status === 'connected') {
        console.log('✓ NASA DONKI API connection test successful');
      } else {
        console.warn('⚠ NASA DONKI API connection test failed:', donkiStatus.message);
      }

      // Test NOAA SWPC Service
      const NoaaSwpcService = require('./services/noaaSwpcService');
      const swpcService = new NoaaSwpcService();
      const swpcStatus = await swpcService.testConnectivity();
      
      if (swpcStatus.status === 'connected') {
        console.log('✓ NOAA SWPC service connection test successful');
      } else {
        console.warn('⚠ NOAA SWPC service connection test failed:', swpcStatus.message);
      }

      // Test NASA NeoWs API
      const NasaNeowsService = require('./services/nasaNeowsService');
      const neowsService = new NasaNeowsService();
      const neowsStatus = await neowsService.testConnectivity();
      
      if (neowsStatus.status === 'connected') {
        console.log('✓ NASA NeoWs API connection test successful');
      } else {
        console.warn('⚠ NASA NeoWs API connection test failed:', neowsStatus.message);
      }
    } catch (error) {
      console.warn('⚠ Could not test API connections:', error.message);
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
