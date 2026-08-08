import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import { AppError } from './utils/AppError';

// Spec §4 defines no variable for the allowed origin, so the Vite dev server is named
// explicitly here rather than defaulting to the wide-open cors() with no arguments.
const CLIENT_ORIGIN = 'http://localhost:5173';

export const app = express();

app.use(express.json());
app.use(cors({ origin: CLIENT_ORIGIN }));

app.use('/api/v1/auth', authRoutes);

// Without this, an unknown API path falls through to Express's default handler, which
// answers with an HTML error page — the one response that would escape the §8.0 envelope.
// Scoped to /api/v1 so it can never shadow the HTML that Swagger UI serves at /api-docs.
// Keep it after every route mount and immediately before the error handler.
app.use('/api/v1', (_req, _res, next) => {
  next(
    new AppError(
      404,
      'ROUTE_NOT_FOUND',
      'The requested endpoint does not exist.',
    ),
  );
});

app.use(errorHandler);
