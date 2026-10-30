import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes import
import cropRoutes from './routes/cropRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import irrigationRoutes from './routes/irrigationRoutes.js';
import regulatoryRoutes from './routes/regulatoryRoutes.js';
import { generateDynamicGtmPlan } from './controllers/gtmController.js';
import bioInputRoutes from './routes/bioInputRoutes.js';
import machineryRoutes from './routes/machineryRoutes.js';
import fertilizerRoutes from './routes/fertilizerRoutes.js';
import cropProtectionRoutes from './routes/cropProtectionRoutes.js';

// Middlewares
import { notFound, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Permissive CORS for Local Development, Vercel & AWS Custom Domain
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5175',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5173',
  'https://agripass-two.vercel.app'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests or server-to-server calls
      if (!origin) return callback(null, true);
      
      if (
        allowedOrigins.includes(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('devtunnels.ms') ||
        origin.includes('vercel.app') ||
        (process.env.ALLOWED_DOMAIN && origin.includes(process.env.ALLOWED_DOMAIN))
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow for smooth demo/staging
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Preflight CORS requests ko force allow karein (405 / preflight error fix)
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. Root & Health Check Endpoints (Fixes root 404 on Render direct visits)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'AgriPath Backend API Engine',
    engine: 'Groq LPU Acceleration',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
};

app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// 2. Core API Routes
app.use('/api/crops', cropRoutes);
app.use('/api', matchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/recommendation', recommendationRoutes);
app.use('/api/regulatory', regulatoryRoutes);
app.use('/api/irrigation', irrigationRoutes);
app.use('/api/match/irrigation', irrigationRoutes);
app.use('/api/regulatory-pathway', regulatoryRoutes);
app.use('/api/bio-inputs', bioInputRoutes);
app.use('/api/machinery', machineryRoutes);

// Fertilizers: Support both plural and singular aliases
app.use('/api/fertilizers', fertilizerRoutes);
app.use('/api/fertilizer', fertilizerRoutes);

app.use('/api/crop-protection', cropProtectionRoutes);

// GTM Execution Routes (Support all frontend persona aliases)
app.post('/api/gtm/generate-plan', generateDynamicGtmPlan);
app.post('/api/gtm/plan', generateDynamicGtmPlan);
app.post('/api/gtm', generateDynamicGtmPlan);
app.post('/api/business/gtm', generateDynamicGtmPlan);
app.post('/api/farmer/gtm', generateDynamicGtmPlan);

// Error Middlewares
app.use(notFound);
app.use(errorHandler);

// Server Listen
app.listen(PORT, () => {
  console.log(`🚀 AgriPath Groq Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});