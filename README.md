# NASA Weather Data API

A comprehensive Node.js backend API that provides weather data and predictions using NASA's POWER (Prediction Of Worldwide Energy Resources) API. This application serves historical weather data for past dates and generates predictions for future dates based on historical averages.

## 🚀 Features

- **Historical Weather Data**: Fetch actual weather measurements from NASA POWER API
- **Weather Predictions**: Generate future weather predictions using arithmetic mean of historical data
- **Multiple Parameters**: Support for various meteorological parameters (temperature, humidity, wind, pressure, etc.)
- **Bulk Processing**: Handle multiple location-date requests in a single API call
- **Multiple Formats**: JSON and CSV output formats
- **Comprehensive Validation**: Input validation with detailed error messages
- **Rate Limiting**: Built-in rate limiting for API protection
- **Health Monitoring**: API health checks and NASA API connectivity monitoring
- **Swagger Documentation**: Interactive API documentation with OpenAPI 3.0

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Weather Parameters](#weather-parameters)
- [Error Handling](#error-handling)
- [Development](#development)
- [Contributing](#contributing)

## 🛠 Installation

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm or yarn
- Internet connection (for NASA API access)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/realtan-net/nova-mind-nasa-space-app-challenge-app
   cd nova-mind-nasa-space-app-challenge-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the API**
   - API: http://localhost:3000/api
   - Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/api/health

## ⚙️ Configuration

Create .env file
### Environment Variables

```env
# Environment variables for NASA Weather API

# Server Configuration
NODE_ENV=development
PORT=3000
REQUEST_TIMEOUT=60000

# NASA POWER API Configuration
NASA_POWER_API_BASE_URL=https://power.larc.nasa.gov/api
NASA_POWER_API_TIMEOUT=30000

# Weather Data Configuration
DEFAULT_HISTORICAL_YEARS=20
MAX_HISTORICAL_YEARS=30
MIN_HISTORICAL_YEARS=5

# Logging
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# NASA DONKI API Configuration
NASA_API_KEY=
NASA_DONKI_BASE_URL=https://api.nasa.gov/DONKI
NASA_API_TIMEOUT=30000

# NOAA SWPC Configuration
NOAA_SWPC_BASE_URL=https://services.swpc.noaa.gov/text
NOAA_SWPC_TIMEOUT=30000

# NASA NeoWs API Configuration
NASA_NEOWS_BASE_URL=https://api.nasa.gov/neo/rest/v1
NASA_NEOWS_TIMEOUT=30000

# OpenAQ Air Quality API Configuration
OPENAQ_BASE_URL=https://api.openaq.org/v3
OPENAQ_API_KEY=
OPENAQ_TIMEOUT=30000

# NASA EPIC (Earth Polychromatic Imaging Camera) Configuration
NASA_EPIC_BASE_URL=https://api.nasa.gov/EPIC/api
NASA_EPIC_ARCHIVE_URL=https://api.nasa.gov/EPIC/archive
NASA_EPIC_TIMEOUT=30000

# NASA APOD (Astronomy Picture of the Day) Configuration
NASA_APOD_BASE_URL=https://api.nasa.gov/planetary/apod
NASA_APOD_TIMEOUT=30000
```

### Configuration Details

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NASA_POWER_API_TIMEOUT` | NASA API request timeout (ms) | 30000 |
| `DEFAULT_HISTORICAL_YEARS` | Default years for predictions | 20 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## 📡 API Endpoints

### Weather Data

#### `GET /api/weather/data`

Get weather data for a specific location and date.

**Parameters:**
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180) 
- `date` (required): Date in YYYY-MM-DD format
- `parameters` (optional): Comma-separated weather parameters
- `historicalYears` (optional): Years for prediction (5-30, default: 20)
- `format` (optional): Response format (json/csv, default: json)

**Example:**
```bash
curl "http://localhost:3000/api/weather/data?latitude=41&longitude=29&date=2025-09-30&parameters=T2M,RH2M,WS10M"
```

#### `POST /api/weather/bulk`

Process multiple weather data requests.

**Request Body:**
```json
{
  "requests": [
    {
      "latitude": 41.0,
      "longitude": 29.0,
      "date": "2025-10-15",
      "parameters": "T2M,RH2M"
    }
  ],
  "historicalYears": 20
}
```

### Parameters & Information

#### `GET /api/weather/parameters`

Get available weather parameters with descriptions and units.

#### `GET /api/weather/historical-range`

Get available date ranges for a location.

**Parameters:**
- `latitude` (required): Latitude
- `longitude` (required): Longitude

### Health & Status

#### `GET /api/health`

API health check and NASA API connectivity status.

## 📊 Usage Examples

### Historical Weather Data

```javascript
const response = await fetch(
  'http://localhost:3000/api/weather/data?' + 
  'latitude=41&longitude=29&date=2023-09-30&parameters=T2M,RH2M'
);
const data = await response.json();

console.log(data.data.dailyAggregates.T2M);
// Output: { min: 14.95, max: 21.41, mean: 18.23, units: "C" }
```

### Weather Prediction

```javascript
const response = await fetch(
  'http://localhost:3000/api/weather/data?' + 
  'latitude=41&longitude=29&date=2026-09-30&historicalYears=15'
);
const prediction = await response.json();

console.log(prediction.data.dataType); // "prediction"
console.log(prediction.data.predictionMethod); // "historical_average"
```

### Bulk Requests

```javascript
const bulkRequest = {
  requests: [
    { latitude: 41.0, longitude: 29.0, date: "2025-12-25" },
    { latitude: 40.7128, longitude: -74.0060, date: "2025-12-25" }
  ],
  historicalYears: 20
};

const response = await fetch('http://localhost:3000/api/weather/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bulkRequest)
});
```

### CSV Export

```bash
curl "http://localhost:3000/api/weather/data?latitude=41&longitude=29&date=2025-09-30&format=csv" \
  -o weather_data.csv
```

## 🌤️ Weather Parameters

### Supported Parameters

| Parameter | Description | Units |
|-----------|-------------|-------|
| **T2M** | Temperature at 2 Meters | °C |
| **RH2M** | Relative Humidity at 2 Meters | % |
| **WS10M** | Wind Speed at 10 Meters | m/s |
| **WD10M** | Wind Direction at 10 Meters | Degrees |
| **PS** | Surface Pressure | kPa |
| **ALLSKY_SFC_SW_DWN** | All Sky Surface Shortwave Downward Irradiance | MJ/hr |
| **PRECTOTCORR** | Precipitation Corrected | mm/day |
| **T2MDEW** | Dew Point Temperature at 2 Meters | °C |

### Default Parameters

If no parameters are specified, the API returns:
`T2M,RH2M,WS10M,WD10M,PS,ALLSKY_SFC_SW_DWN`

## 📋 Response Format

### Successful Response

```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 41.0,
      "longitude": 29.0,
      "elevation": 59.56
    },
    "date": "2025-09-30",
    "dataType": "historical",
    "hourlyData": {
      "T2M": {
        "2025093000": 15.32,
        "2025093001": 15.14
      }
    },
    "dailyAggregates": {
      "T2M": {
        "min": 14.95,
        "max": 21.41,
        "mean": 18.23,
        "units": "C"
      }
    },
    "metadata": {
      "source": "NASA POWER API",
      "version": "v2.8.0",
      "fillValue": -999.0
    }
  },
  "requestTimestamp": "2025-10-04T12:00:00Z",
  "processingTime": 245
}
```

### Prediction Response

For future dates, additional fields are included:

```json
{
  "data": {
    "dataType": "prediction",
    "predictionMethod": "historical_average",
    "historicalYearsUsed": 20,
    "historicalDateRange": "2005-09-30 to 2024-09-30",
    "predictionMetadata": {
      "method": "arithmetic_mean",
      "dataPoints": 20,
      "reliability": "medium"
    }
  }
}
```

## ⚠️ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "latitude",
        "message": "Latitude must be between -90 and 90",
        "provided": "95.0"
      }
    ]
  },
  "requestTimestamp": "2025-10-04T12:00:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `EXTERNAL_API_ERROR` | 502 | NASA API error |
| `API_TIMEOUT` | 504 | Request timeout |
| `RATE_LIMIT` | 429 | Too many requests |
| `NOT_FOUND` | 404 | Endpoint not found |

## 🔧 Development

### Project Structure

```
src/
├── app.js                    # Application entry point
├── config/
│   └── config.js            # Configuration management
├── controllers/
│   └── weatherController.js # Request handling logic
├── services/
│   ├── nasaApiService.js    # NASA API communication
│   ├── weatherDataService.js # Data processing
│   └── validationService.js # Input validation
├── middleware/
│   └── errorHandler.js      # Error handling
└── routes/
    ├── weatherRoutes.js     # Weather endpoints
    └── healthRoutes.js      # Health endpoints
```

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Production start
npm start

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing the API

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test weather data
curl "http://localhost:3000/api/weather/data?latitude=41&longitude=29&date=2023-01-01"

# Test parameters endpoint
curl http://localhost:3000/api/weather/parameters
```

## 🌟 Prediction Algorithm

### Arithmetic Mean Approach

For future date predictions, the API:

1. **Extracts date components** (month and day) from the target date
2. **Queries historical data** for the same month-day across specified years
3. **Calculates arithmetic mean** for each hour and parameter
4. **Handles missing data** by excluding -999.0 fill values
5. **Returns averaged values** with confidence metrics

### Advantages

- ✅ Simple and transparent methodology
- ✅ Fast processing and minimal resources
- ✅ No training data required
- ✅ Consistent and reproducible results
- ✅ Good baseline accuracy for stable patterns

## 📚 API Documentation

Interactive API documentation is available at `/api-docs` when the server is running. The documentation includes:

- Complete endpoint specifications
- Request/response schemas
- Parameter validation rules
- Example requests and responses
- Error code references

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@weatherapi.com
- 📖 Documentation: http://localhost:3000/api-docs
- 🐛 Issues: GitHub Issues
- 🌟 NASA POWER API: https://power.larc.nasa.gov/

## 🙏 Acknowledgments

- NASA POWER API for providing satellite-derived meteorological data
- NASA Space Apps Challenge for inspiring this project
- All contributors and users of this API

---

**Built with ❤️ for the NASA Space Apps Challenge**
