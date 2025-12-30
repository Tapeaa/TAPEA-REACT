import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/places/autocomplete', async (req, res) => {
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

app.get('/places/details', async (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PLACES PROXY] Server running on port ${PORT}`);
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[PLACES PROXY] Warning: GOOGLE_MAPS_API_KEY not set');
  }
});
