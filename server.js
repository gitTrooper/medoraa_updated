// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const PORT = 3001;
const GOOGLE_API_KEY = 'AIzaSyD7ZdNKcnNMS69Ny3QmJFTozeU-gGJYGqg';

app.use(cors());

app.get('/api/search-hospitals', async (req, res) => {
  const { lat, lng } = req.query;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=hospitals&location=${lat},${lng}&radius=5000&key=${GOOGLE_API_KEY}`;

  try {
    console.log(`🔁 Forwarding request to Google API: ${url}`);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    console.error('❌ Failed to fetch from Google Places API:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
