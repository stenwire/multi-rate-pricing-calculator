// Runs before any module is imported. config/env.ts validates at import time and exits the
// process on failure, so the suite would die before mongodb-memory-server could supply a URI.
// dotenv does not overwrite variables that are already set, so these also insulate the run
// from whatever happens to be in the developer's root .env.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/pricing-calculator-test';
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '5000';
