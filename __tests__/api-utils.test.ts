import { describe, it, expect } from 'vitest';
import { apiError, errors } from '@/lib/api-utils';

describe('api-utils', () => {
  describe('apiError', () => {
    it('creates a JSON response with status code', () => {
      const response = apiError('Something went wrong', 'BAD_REQUEST', 400);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(400);
    });

    it('creates 500 error', () => {
      const response = apiError('Internal error', 'INTERNAL_ERROR', 500);
      expect(response.status).toBe(500);
    });

    it('includes error message in body', async () => {
      const response = apiError('Test error', 'VALIDATION', 422);
      const body = await response.json();
      expect(body.error).toBe('Test error');
    });
  });

  describe('errors', () => {
    it('creates badRequest (400)', () => {
      const response = errors.badRequest('Invalid input');
      expect(response.status).toBe(400);
    });

    it('creates unauthorized (401)', () => {
      const response = errors.unauthorized();
      expect(response.status).toBe(401);
    });

    it('creates forbidden (403)', () => {
      const response = errors.forbidden();
      expect(response.status).toBe(403);
    });

    it('creates notFound (404)', () => {
      const response = errors.notFound();
      expect(response.status).toBe(404);
    });

    it('creates rateLimited (429)', () => {
      const response = errors.rateLimited();
      expect(response.status).toBe(429);
    });

    it('creates internal (500)', () => {
      const response = errors.internal();
      expect(response.status).toBe(500);
    });

    it('uses custom message', async () => {
      const response = errors.badRequest('Custom message');
      const body = await response.json();
      expect(body.error).toBe('Custom message');
    });
  });
});
