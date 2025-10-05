# Quick Start Guide: OpenAQ Air Quality API

## 🚀 Quick Start

The OpenAQ Air Quality Data Platform is now integrated into your API. Here's how to use it immediately.

## 📍 Endpoints

### Base URL
```
http://localhost:3000/api/openaq
```

## 🔍 1. Find Air Quality Stations Near You

**Endpoint:** `GET /api/openaq/stations`

**Purpose:** Find air quality monitoring stations near your location.

### Example Request (Istanbul)
```bash
curl "http://localhost:3000/api/openaq/stations?coordinates=41.0082,28.9784&radius=25000&limit=10"
```

### Parameters
- `coordinates` (required) - Format: "latitude,longitude"
- `radius` (optional) - Search radius in meters (default: 25000 = 25km)
- `limit` (optional) - Max stations to return (default: 10)

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 3517,
      "name": "İstanbul - Kağıthane",
      "distance": 8840.17,
      "sensors": [...]
    }
  ]
}
```

## 📊 2. Get Sensor Measurements

**Endpoint:** `GET /api/openaq/measurements/:sensorId`

**Purpose:** Get the latest measurement from a specific sensor.

### Example Request
```bash
curl "http://localhost:3000/api/openaq/measurements/7017785"
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "value": 28.5,
      "parameter": {
        "name": "pm25",
        "displayName": "PM2.5",
        "units": "µg/m³"
      },
      "assessment": {
        "quality": "Moderate",
        "level": 2,
        "color": "yellow",
        "icon": "⚠️"
      }
    }
  ]
}
```

## 🎯 3. Get Complete Air Quality Assessment (RECOMMENDED)

**Endpoint:** `GET /api/openaq/airquality`

**Purpose:** Get comprehensive air quality data with health recommendations.

### Example Request (Istanbul)
```bash
curl "http://localhost:3000/api/openaq/airquality?coordinates=41.0082,28.9784"
```

### Response
```json
{
  "success": true,
  "data": {
    "station": {
      "id": 3517,
      "name": "İstanbul - Kağıthane",
      "distance": 8840.17
    },
    "measurements": [
      {
        "parameter": "PM2.5",
        "value": 25.4,
        "unit": "µg/m³",
        "quality": "Moderate",
        "color": "yellow"
      }
    ],
    "assessment": {
      "overallQuality": "Moderate",
      "overallLevel": 2,
      "primaryPollutant": "PM2.5",
      "description": "Air quality is moderate..."
    },
    "healthRecommendations": {
      "general": "Air quality is acceptable for most people.",
      "sensitive": "Consider limiting prolonged outdoor exertion.",
      "activities": "Enjoy your usual outdoor activities."
    }
  }
}
```

## 🌍 Popular City Coordinates

Use these coordinates to test the API:

| City | Coordinates |
|------|-------------|
| Istanbul, Turkey | `41.0082,28.9784` |
| New York, USA | `40.7128,-74.0060` |
| London, UK | `51.5074,-0.1278` |
| Paris, France | `48.8566,2.3522` |
| Tokyo, Japan | `35.6762,139.6503` |
| Beijing, China | `39.9042,116.4074` |
| Delhi, India | `28.7041,77.1025` |
| Los Angeles, USA | `34.0522,-118.2437` |
| São Paulo, Brazil | `-23.5505,-46.6333` |
| Cairo, Egypt | `30.0444,31.2357` |

## 🔗 Swagger UI (RECOMMENDED)

The easiest way to test all endpoints is via Swagger UI:

**Open in browser:** http://localhost:3000/api-docs

1. Navigate to the **"Air Quality"** section
2. Click on any endpoint to expand
3. Click **"Try it out"**
4. Enter parameters
5. Click **"Execute"**
6. View the response

## 💡 Quick Examples

### Example 1: Check Air Quality in New York
```bash
curl "http://localhost:3000/api/openaq/airquality?coordinates=40.7128,-74.0060"
```

### Example 2: Find Stations in Paris (50km radius)
```bash
curl "http://localhost:3000/api/openaq/stations?coordinates=48.8566,2.3522&radius=50000"
```

### Example 3: Get PM2.5 Reading from Specific Sensor
```bash
curl "http://localhost:3000/api/openaq/measurements/7017785"
```

## 📈 Understanding Air Quality Levels

| Level | Quality | Color | Description |
|-------|---------|-------|-------------|
| 1 | Good | 🟢 Green | Safe for everyone |
| 2 | Moderate | 🟡 Yellow | Acceptable, but sensitive people may be affected |
| 3 | Unhealthy for Sensitive | 🟠 Orange | Sensitive groups should limit outdoor activity |
| 4 | Unhealthy | 🔴 Red | Everyone should reduce outdoor activity |

## 🧪 Testing Workflow

1. **Start Server** (if not already running)
   ```bash
   npm start
   ```

2. **Open Swagger UI**
   ```
   http://localhost:3000/api-docs
   ```

3. **Test the `/airquality` endpoint** (most comprehensive)
   - Input: Your coordinates
   - Review: Station info, measurements, assessment, recommendations

4. **Explore other endpoints** as needed

## ❌ Common Errors

### Error: No stations found
```json
{
  "error": {
    "code": "NO_STATIONS_FOUND",
    "message": "No air quality monitoring stations found in the specified area"
  }
}
```
**Solution:** Increase the `radius` parameter or try different coordinates.

### Error: Invalid coordinates
```json
{
  "error": {
    "code": "INVALID_COORDINATES",
    "message": "Latitude and longitude are required"
  }
}
```
**Solution:** Ensure coordinates are in format "lat,lon" (e.g., "41.0082,28.9784")

## 🎓 Integration Patterns

### Pattern 1: Real-time Air Quality Display
```javascript
// Fetch air quality for user's location
const response = await fetch(
  `http://localhost:3000/api/openaq/airquality?coordinates=${lat},${lon}`
);
const { data } = await response.json();

// Display overall quality
console.log(`Air Quality: ${data.assessment.overallQuality}`);
console.log(`Primary Pollutant: ${data.assessment.primaryPollutant}`);

// Show health recommendations
console.log(data.healthRecommendations.general);
```

### Pattern 2: Find Nearest Station
```javascript
// Find stations within 25km
const response = await fetch(
  `http://localhost:3000/api/openaq/stations?coordinates=${lat},${lon}&radius=25000&limit=5`
);
const { data } = await response.json();

// Get nearest station
const nearest = data[0];
console.log(`Nearest station: ${nearest.name} (${nearest.distance}m away)`);
```

### Pattern 3: Monitor Specific Pollutant
```javascript
// Get comprehensive air quality
const response = await fetch(
  `http://localhost:3000/api/openaq/airquality?coordinates=${lat},${lon}`
);
const { data } = await response.json();

// Find PM2.5 measurement
const pm25 = data.measurements.find(m => m.parameterCode === 'pm25');
if (pm25) {
  console.log(`PM2.5: ${pm25.value} ${pm25.unit}`);
  console.log(`Quality: ${pm25.quality} (${pm25.color})`);
}
```

## 🔥 Pro Tips

1. **Use `/airquality` for most use cases** - It's the most comprehensive endpoint
2. **Cache results** - Air quality doesn't change every second; cache for 10-30 minutes
3. **Start with 25km radius** - Good balance between finding stations and relevance
4. **Check `hasPM25`** - PM2.5 is the most important air quality indicator
5. **Display health recommendations** - They're user-friendly and actionable

## 📚 Learn More

- Full API Documentation: http://localhost:3000/api-docs
- Complete Implementation Guide: `OPENAQ_IMPLEMENTATION_COMPLETE.md`
- OpenAQ Official Site: https://openaq.org/

---

**Ready to test?** Open http://localhost:3000/api-docs and try the Air Quality endpoints!
