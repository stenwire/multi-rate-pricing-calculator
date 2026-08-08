import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';

// Spec §4 defines no variable for the allowed origin, so the Vite dev server is named
// explicitly here rather than defaulting to the wide-open cors() with no arguments.
const CLIENT_ORIGIN = 'http://localhost:5173';

export const app = express();

app.use(express.json());
app.use(cors({ origin: CLIENT_ORIGIN }));

app.use('/api/v1/auth', authRoutes);

app.use(errorHandler);
