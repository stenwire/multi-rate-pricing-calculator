import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import {
  API,
  clearCollections,
  connectTestDatabase,
  disconnectTestDatabase,
} from './helpers';

const CREDENTIALS = { email: 'user@example.com', password: 'securepassword' };

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);
beforeEach(clearCollections);

describe('POST /auth/register', () => {
  it('returns the user and a token', async () => {
    const response = await request(app)
      .post(`${API}/auth/register`)
      .send(CREDENTIALS);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Registration successful.');
    expect(Object.keys(response.body.data.user).sort()).toEqual([
      'createdAt',
      'email',
      'id',
    ]);
    expect(typeof response.body.data.token).toBe('string');
  });

  it('never exposes the password hash', async () => {
    const response = await request(app)
      .post(`${API}/auth/register`)
      .send(CREDENTIALS);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(CREDENTIALS.password);
  });

  it('stores a bcrypt hash at 12 rounds rather than the password', async () => {
    await request(app).post(`${API}/auth/register`).send(CREDENTIALS);

    const stored = await User.findOne({ email: CREDENTIALS.email });

    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored?.passwordHash).not.toBe(CREDENTIALS.password);
  });

  it('signs a verifiable token carrying the user id', async () => {
    const response = await request(app)
      .post(`${API}/auth/register`)
      .send(CREDENTIALS);

    const payload = jwt.verify(
      response.body.data.token,
      process.env.JWT_SECRET as string,
    );

    expect(typeof payload).toBe('object');
    expect((payload as { userId: string }).userId).toBe(
      response.body.data.user.id,
    );
  });

  it('normalises the email before storing it', async () => {
    const response = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: '  USER@Example.COM  ', password: CREDENTIALS.password });

    expect(response.body.data.user.email).toBe('user@example.com');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post(`${API}/auth/register`).send(CREDENTIALS);

    const response = await request(app)
      .post(`${API}/auth/register`)
      .send(CREDENTIALS);

    expect(response.status).toBe(409);
    expect(response.body.error_code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rejects an invalid email and a short password with field-level details', async () => {
    const badEmail = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: 'not-an-email', password: CREDENTIALS.password });
    const shortPassword = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: 'other@example.com', password: 'short' });

    expect(badEmail.status).toBe(400);
    expect(badEmail.body.details[0].field).toBe('email');
    expect(shortPassword.status).toBe(400);
    expect(shortPassword.body.details[0].field).toBe('password');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post(`${API}/auth/register`).send(CREDENTIALS);
  });

  it('returns the user and a token for correct credentials', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .send(CREDENTIALS);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful.');
    expect(response.body.data.user.email).toBe(CREDENTIALS.email);
    expect(typeof response.body.data.token).toBe('string');
  });

  it('accepts the email in any case', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'USER@EXAMPLE.COM', password: CREDENTIALS.password });

    expect(response.status).toBe(200);
  });

  // Spec §6.2: the two failure modes must be indistinguishable, or an attacker can
  // enumerate which email addresses have accounts.
  it('answers an unknown email and a wrong password identically', async () => {
    const unknownEmail = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'nobody@example.com', password: CREDENTIALS.password });
    const wrongPassword = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: CREDENTIALS.email, password: 'wrongpassword' });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error_code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.status).toBe(wrongPassword.status);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('never exposes the password hash on a successful login', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .send(CREDENTIALS);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
});
