import express from 'express';
import axios from 'axios';
import Query from '../models/Query.js';

const router = express.Router();

// Helper function to construct detailed prompt for Gemini
const constructGeminiPrompt = (location, query, weatherData) => {
  const { temperature, condition, humidity, windSpeed } = weatherData;
  
  return `You are an expert agricultural advisor specializing in Indian farming practices. A farmer from ${location} needs your guidance.

Current Weather Conditions:
- Temperature: ${temperature}°C
- Weather Condition: ${condition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} kph

Farmer's Question: "${query}"

Please provide a comprehensive, actionable recommendation that:
1. Considers the current weather conditions and location
2. Offers specific crop suggestions if applicable
3. Includes seasonal timing advice
4. Mentions any weather-related precautions
5. Provides practical next steps

Structure your response with clear headings and bullet points for easy reading. Focus on practical, implementable advice suitable for the local conditions.`;
};

// Main API endpoint for processing farmer queries
router.post('/ask', async (req, res) => {
  try {
    const { location, query } = req.body;

    // Validate input
    if (!location || !query) {
      return res.status(400).json({
        error: 'Both location and query are required'
      });
    }

    // Step 1: Geocoding API call
    const geoResponse = await axios.get(
  `https://api.opencagedata.com/geocode/v1/json?q=${location}&key=${process.env.GEO_API_KEY}`
    );

    if (!geoResponse.data || !geoResponse.data.results || geoResponse.data.results.length === 0) {
      return res.status(400).json({
        error: 'Location not found. Please try a different location.'
      });
    }

    const coordinates = {
    lat: geoResponse.data.results[0].geometry.lat,
    lon: geoResponse.data.results[0].geometry.lng // Use .geometry and lng
    };

    // Step 2: Weather API call
    const weatherResponse = await axios.get(
      `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${coordinates.lat},${coordinates.lon}`
    );

    const weatherData = {
      temperature: weatherResponse.data.current.temp_c,
      condition: weatherResponse.data.current.condition.text,
      humidity: weatherResponse.data.current.humidity,
      windSpeed: weatherResponse.data.current.wind_kph,
      feelsLike: weatherResponse.data.current.feelslike_c,
      uvIndex: weatherResponse.data.current.uv
    };

   // Step 3: Gemini API call
const prompt = constructGeminiPrompt(location, query, weatherData);

// --- REPLACE THE BLOCK BELOW ---
const geminiPayload = {
  contents: [{
    parts: [{ text: prompt }]
  }]
};

const geminiResponse = await axios.post(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
  geminiPayload,
  {
    headers: {
      'Content-Type': 'application/json',
    },
  }
);
// --- END OF REPLACEMENT ---

const aiResponse = geminiResponse.data.candidates[0].content.parts[0].text;

    // Step 4: Save to database
    const newQuery = new Query({
      location,
      query,
      response: aiResponse,
      weatherData,
      coordinates
    });

    await newQuery.save();

    // Step 5: Send response to frontend
    res.json({
      response: aiResponse,
      weather: weatherData,
      coordinates,
      location
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Provide specific error messages based on the error type
    if (error.response && error.response.status === 401) {
      return res.status(500).json({
        error: 'API authentication failed. Please check your API keys.'
      });
    }
    
    if (error.response && error.response.status === 429) {
      return res.status(500).json({
        error: 'API rate limit exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'Unable to process your request. Please try again.'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;