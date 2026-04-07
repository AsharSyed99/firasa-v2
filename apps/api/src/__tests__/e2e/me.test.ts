import { setup, cleanup, AUTH_HEADER } from '../setup-e2e';
import type { TestContext } from '../setup-e2e';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setup();
}, 30_000);

afterAll(async () => {
  await cleanup();
});

describe('Me API', () => {
  describe('GET /api/v1/me', () => {
    it('returns 401 without auth', async () => {
      const res = await ctx.request.get('/api/v1/me');
      expect(res.status).toBe(401);
    });

    it('returns user profile with auth', async () => {
      const res = await ctx.request.get('/api/v1/me').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = res.body.data;
      expect(user.email).toBe('dev@firasa.app');
      expect(user.displayName).toBe('Test User');
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('tier');
      expect(user).toHaveProperty('onboardingDone');
      expect(user).toHaveProperty('createdAt');
    });
  });

  describe('PATCH /api/v1/me/preferences', () => {
    it('updates quiet hours and email preferences', async () => {
      const res = await ctx.request
        .patch('/api/v1/me/preferences')
        .set(AUTH_HEADER)
        .send({
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          emailEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quietHoursStart).toBe('22:00');
      expect(res.body.data.quietHoursEnd).toBe('08:00');
      expect(res.body.data.emailEnabled).toBe(true);
    });

    it('persists the updated preferences', async () => {
      const res = await ctx.request
        .get('/api/v1/me/preferences')
        .set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data.quietHoursStart).toBe('22:00');
      expect(res.body.data.emailEnabled).toBe(true);
    });
  });

  // DELETE must be last — it removes the user permanently
  describe('DELETE /api/v1/me/account', () => {
    it('deletes the user account', async () => {
      const res = await ctx.request
        .delete('/api/v1/me/account')
        .set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Account permanently deleted');
    });

    it('auto-creates a fresh user on next auth request', async () => {
      const res = await ctx.request.get('/api/v1/me').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      // New auto-created user has no displayName (Firebase mock has no name)
      expect(res.body.data.displayName).toBeNull();
      expect(res.body.data.email).toBe('dev@firasa.app');
    });
  });
});
