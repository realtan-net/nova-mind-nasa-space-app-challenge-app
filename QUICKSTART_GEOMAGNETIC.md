# Quick Start Guide - Geomagnetic Storm API

## 🚀 Getting Started

### 1. Start the Server
```bash
cd /home/altan/Desktop/nova-mind-bcknd
npm start
```

Server will start on http://localhost:3000

### 2. View API Documentation
Open in your browser:
```
http://localhost:3000/api-docs
```

### 3. Test the Endpoints

#### Get Recent Geomagnetic Storms
```bash
curl "http://localhost:3000/api/geomagnetic/storms?startDate=2025-09-05&endDate=2025-10-05"
```

#### Get 3-Day Forecast
```bash
curl "http://localhost:3000/api/geomagnetic/forecast/3-day"
```

#### Get 27-Day Outlook
```bash
curl "http://localhost:3000/api/geomagnetic/forecast/27-day"
```

#### Get Combined Forecasts
```bash
curl "http://localhost:3000/api/geomagnetic/forecast/combined"
```

#### List All Endpoints
```bash
curl "http://localhost:3000/api"
```

## 📊 Example Response

### NASA DONKI Storms
```json
{
  "success": true,
  "data": {
    "source": "NASA DONKI GST",
    "dateRange": {
      "startDate": "2025-09-05",
      "endDate": "2025-10-05"
    },
    "storms": [
      {
        "gstID": "2025-09-30T03:00:00-GST-001",
        "startTime": "2025-09-30T03:00Z",
        "allKpIndex": [
          {
            "observedTime": "2025-09-30T06:00Z",
            "kpIndex": 7.33,
            "source": "NOAA"
          }
        ],
        "linkedEvents": [...],
        "link": "https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/GST/41517/-1"
      }
    ],
    "totalCount": 3,
    "statistics": {
      "maxKpIndex": 7.33,
      "averageKpIndex": "6.10",
      "totalKpObservations": 12
    }
  },
  "requestTimestamp": "2025-10-05T01:34:44.345Z",
  "processingTime": 342
}
```

## 🎯 Key Features

- ✅ Real-time geomagnetic storm data from NASA
- ✅ 3-day and 27-day forecasts from NOAA
- ✅ Kp index tracking
- ✅ Storm statistics and analysis
- ✅ Linked space weather events
- ✅ No rate limiting
- ✅ Full Swagger documentation

## 📝 Query Parameters

### /api/geomagnetic/storms
- `startDate` (optional): YYYY-MM-DD format, default: 30 days ago
- `endDate` (optional): YYYY-MM-DD format, default: current date

### Forecast Endpoints
- No parameters required
- Always returns latest forecast data

## 🔗 Data Sources

1. **NASA DONKI** - Space Weather Database of Notifications, Knowledge, Information
   - Historical geomagnetic storm data
   - Real-time Kp index observations

2. **NOAA SWPC** - Space Weather Prediction Center
   - 3-day geomagnetic forecasts
   - 27-day outlook predictions

## 📚 Documentation

Full API documentation available at:
- Swagger UI: http://localhost:3000/api-docs
- OpenAPI Spec: http://localhost:3000/api-spec
- Implementation Details: GEOMAGNETIC_IMPLEMENTATION.md

## ⚙️ Configuration

All configuration is in `.env` file:
```
NASA_API_KEY=ERFKEEmbK1uEuDfNPuW7CUSj9DAVvscXxkEWc5nB
NASA_DONKI_BASE_URL=https://api.nasa.gov/DONKI
NOAA_SWPC_BASE_URL=https://services.swpc.noaa.gov/text
```

## 🎓 Understanding Kp Index

The Kp index ranges from 0-9 and indicates geomagnetic activity:
- **0-2**: Quiet
- **3**: Unsettled  
- **4**: Active
- **5**: G1 - Minor Storm
- **6**: G2 - Moderate Storm
- **7**: G3 - Strong Storm
- **8**: G4 - Severe Storm
- **9**: G5 - Extreme Storm

## 🚨 Error Handling

The API returns structured error responses:
```json
{
  "success": false,
  "error": {
    "code": "DATE_RANGE_INVALID",
    "message": "Invalid startDate format. Expected YYYY-MM-DD",
    "details": { "startDate": "invalid-date" }
  },
  "requestTimestamp": "2025-10-05T01:00:00Z"
}
```

## 💡 Tips

1. **Date Ranges**: Keep date ranges reasonable (30-90 days) for better performance
2. **Caching**: Consider caching forecast data as it updates infrequently
3. **Monitoring**: High Kp values (≥5) indicate potential aurora visibility
4. **Timestamps**: All timestamps are in ISO-8601 UTC format

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Kill existing process
pkill -f "node src/app.js"
```

### Module Not Found
```bash
# Reinstall dependencies
npm install
```

### Config Not Loading
```bash
# Verify .env file exists
cat .env | grep NASA_API_KEY
```

## ✨ Next Steps

1. Explore the Swagger UI for interactive testing
2. Review GEOMAGNETIC_IMPLEMENTATION.md for technical details
3. Integrate with your frontend application
4. Set up monitoring for high Kp events

Happy coding! 🎉
