import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes import
import cropRoutes from './routes/cropRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import regulatoryRoutes from './routes/regulatoryRoutes.js';
import { generateDynamicGtmPlan } from './controllers/gtmController.js';
import bioInputRoutes from './routes/bioInputRoutes.js';

// Middlewares
import { notFound, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost and any devtunnels URL
      if (!origin || origin.includes('localhost') || origin.includes('devtunnels.ms')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'AgriPath Backend API',
  });
});

// API Routes
app.use('/api/crops', cropRoutes);
app.use('/api', matchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/regulatory', regulatoryRoutes);
app.use('/api/regulatory-pathway', regulatoryRoutes);
app.use('/api/bio-inputs', bioInputRoutes);

app.post('/api/gtm/generate-plan', generateDynamicGtmPlan);
// Error Middlewares
app.use(notFound);
app.use(errorHandler);

// Server Listen
app.listen(PORT, () => {
  console.log(`🚀 AgriPath Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});