import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import lineItemRoutes from './routes/lineItem.routes';
import reportRoutes from './routes/report.routes';
import { setupSwagger } from './swagger';
import { AppError } from './utils/AppError';
import { env } from './config/env';

export const app = express();

// An explicit allowlist rather than the wide-open cors() with no arguments. cors() echoes
// back whichever entry matches, so a request from an origin outside the list gets no
// Access-Control-Allow-Origin header at all and the browser blocks it.
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/documents', lineItemRoutes);
app.use('/api/v1/reports', reportRoutes);

setupSwagger(app);

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
