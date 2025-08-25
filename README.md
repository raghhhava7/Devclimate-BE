# Weather App Backend

A Node.js Express server providing weather data and user authentication APIs.

## Features

- Weather data API integration
- User authentication and authorization
- RESTful API endpoints
- CORS enabled for frontend integration
- Environment-based configuration

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```
   PORT=3001
   WEATHER_API_KEY=your_weather_api_key
   WEATHER_API_URL=https://api.openweathermap.org/data/2.5
   JWT_SECRET=your_jwt_secret
   ```

### Development

Start the development server:
```bash
npm start
```

The server will be available at `http://localhost:3001`

### Development with auto-reload

If you have nodemon installed:
```bash
npm run dev
```

## API Endpoints

### Weather Endpoints

- `GET /api/weather/current?lat={lat}&lon={lon}` - Get current weather by coordinates
- `GET /api/weather/forecast?lat={lat}&lon={lon}` - Get weather forecast
- `GET /api/weather/search?q={city}` - Search weather by city name

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile (requires authentication)

## Environment Variables

- `PORT` - Server port (default: 3001)
- `WEATHER_API_KEY` - Weather service API key
- `WEATHER_API_URL` - Weather service base URL
- `JWT_SECRET` - Secret for JWT token signing

## Project Structure

```
├── server.js           # Main server file
├── routes/             # API route handlers
├── middleware/         # Custom middleware
├── controllers/        # Business logic
├── models/             # Data models
└── utils/              # Utility functions
```

## Deployment

This app is configured for deployment on Vercel. The `vercel.json` file contains the necessary configuration for serverless deployment.

## API Documentation

### Weather API Response Format

```json
{
  "location": {
    "name": "City Name",
    "country": "Country Code",
    "lat": 0.0,
    "lon": 0.0
  },
  "current": {
    "temperature": 25,
    "description": "Clear sky",
    "humidity": 60,
    "windSpeed": 5.2,
    "icon": "01d"
  }
}
```

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.