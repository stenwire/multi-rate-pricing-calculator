import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  testTimeout: 30000,
  clearMocks: true,
};

export default config;
