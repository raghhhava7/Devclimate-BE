import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
let db
const client = new MongoClient(process.env.MONGODB_URI)

async function connectDB() {
  try {
    await client.connect()
    db = client.db('devclimate')
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DevClimate API is running' })
})

app.get('/', (req, res) => {
  res.send("DevClimate server is running");
})

// Auth Routes
// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    }

    const result = await db.collection('users').insertOne(user)

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.insertedId, username, email }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
})

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const user = await db.collection('users').findOne({ email })

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Failed to get user profile' })
  }
})

// Get current weather for a city (protected route)
app.get('/api/weather/current/:city', authenticateToken, async (req, res) => {
  try {
    const { city } = req.params
    const userId = req.user.userId
    
    if (!city) {
      return res.status(400).json({ error: 'City name is required' })
    }

    // Fetch weather data from OpenWeatherMap API
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    )

    if (!weatherResponse.ok) {
      if (weatherResponse.status === 404) {
        return res.status(404).json({ error: 'City not found' })
      }
      throw new Error('Weather API request failed')
    }

    const weatherData = await weatherResponse.json()

    // Save the weather search to database
    const weatherSearch = {
      userId,
      city: weatherData.name,
      country: weatherData.sys.country,
      temperature: Math.round(weatherData.main.temp),
      description: weatherData.weather[0].description,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
      pressure: weatherData.main.pressure,
      feelsLike: Math.round(weatherData.main.feels_like),
      timestamp: new Date()
    }

    const result = await db.collection('weather_searches').insertOne(weatherSearch)

    // Return the weather data with the saved record ID
    res.json({
      id: result.insertedId,
      ...weatherSearch,
      icon: weatherData.weather[0].icon
    })
  } catch (error) {
    console.error('Error fetching weather data:', error)
    res.status(500).json({ error: 'Failed to fetch weather data' })
  }
})

// Get user's weather searches with pagination (protected route)
app.get('/api/weather', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit

    const totalSearches = await db.collection('weather_searches').countDocuments({ userId })
    const totalPages = Math.ceil(totalSearches / limit)

    const searches = await db.collection('weather_searches')
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    res.json({
      searches,
      currentPage: page,
      totalPages,
      totalSearches
    })
  } catch (error) {
    console.error('Error fetching weather searches:', error)
    res.status(500).json({ error: 'Failed to fetch weather searches' })
  }
})

// Delete a weather search (protected route)
app.delete('/api/weather/:searchId', authenticateToken, async (req, res) => {
  try {
    const { searchId } = req.params
    const userId = req.user.userId
    
    if (!ObjectId.isValid(searchId)) {
      return res.status(400).json({ error: 'Invalid search ID' })
    }

    const result = await db.collection('weather_searches').deleteOne({ 
      _id: new ObjectId(searchId),
      userId: userId // Ensure user can only delete their own searches
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Weather search not found or unauthorized' })
    }

    res.json({ message: 'Weather search deleted successfully' })
  } catch (error) {
    console.error('Error deleting weather search:', error)
    res.status(500).json({ error: 'Failed to delete weather search' })
  }
})

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})