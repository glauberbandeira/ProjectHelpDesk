import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  const app = createApp();

  it('deve responder 200 com status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('deve responder em JSON', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['content-type']).toMatch(/json/);
  });
});