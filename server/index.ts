import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 5000;
const EXPO_PORT = 8081;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/places/autocomplete', async (req, res) => {
  const input = req.query.input as string;

  if (!input || input.length < 3) {
    return res.json({ predictions: [] });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('[PLACES] Google Maps API key not configured');
    return res.status(500).json({ error: 'API Google Maps non configurée' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:pf&key=${GOOGLE_MAPS_API_KEY}&language=fr`
    );
    const data = await response.json();

    if (data.status === 'OK') {
      res.json({ predictions: data.predictions });
    } else if (data.status === 'ZERO_RESULTS') {
      res.json({ predictions: [] });
    } else {
      console.error('[PLACES] Autocomplete error:', data.status, data.error_message);
      res.status(500).json({ error: data.error_message || 'Erreur API Google' });
    }
  } catch (error) {
    console.error('[PLACES] Autocomplete fetch error:', error);
    res.status(500).json({ error: 'Erreur de connexion à l\'API Google' });
  }
});

app.get('/api/places/details', async (req, res) => {
  const placeId = req.query.place_id as string;

  if (!placeId) {
    return res.status(400).json({ error: 'place_id requis' });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('[PLACES] Google Maps API key not configured');
    return res.status(500).json({ error: 'API Google Maps non configurée' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.result?.geometry?.location) {
      res.json({
        location: {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        },
      });
    } else {
      console.error('[PLACES] Details error:', data.status, data.error_message);
      res.status(500).json({ error: data.error_message || 'Lieu non trouvé' });
    }
  } catch (error) {
    console.error('[PLACES] Details fetch error:', error);
    res.status(500).json({ error: 'Erreur de connexion à l\'API Google' });
  }
});

app.use('/', createProxyMiddleware({
  target: `http://localhost:${EXPO_PORT}`,
  changeOrigin: true,
  ws: true,
  logLevel: 'warn',
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Proxying Expo from port ${EXPO_PORT}`);
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[SERVER] Warning: GOOGLE_MAPS_API_KEY not set');
  } else {
    console.log('[SERVER] Google Places API ready');
  }
});
