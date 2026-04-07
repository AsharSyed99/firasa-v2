import { setup, cleanup, AUTH_HEADER } from '../setup-e2e';
import type { TestContext } from '../setup-e2e';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setup();
}, 30_000);

afterAll(async () => {
  await cleanup();
});

describe('Signals API', () => {
  describe('GET /api/v1/signals', () => {
    it('returns 401 without auth', async () => {
      const res = await ctx.request.get('/api/v1/signals');
      expect(res.status).toBe(401);
    });

    it('returns paginated signals with auth', async () => {
      const res = await ctx.request.get('/api/v1/signals').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);

      const signal = res.body.data[0];
      expect(signal).toHaveProperty('id');
      expect(signal).toHaveProperty('guruHandle');
      expect(signal).toHaveProperty('guruName');
      expect(signal).toHaveProperty('tickers');
      expect(signal).toHaveProperty('action');
      expect(signal).toHaveProperty('sentiment');
      expect(signal).toHaveProperty('score');
      expect(signal).toHaveProperty('createdAt');

      // Meta includes cursor for pagination
      expect(res.body).toHaveProperty('meta');
    });

    it('filters by action=BUY', async () => {
      const res = await ctx.request
        .get('/api/v1/signals?action=BUY')
        .set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((s: { action: string }) => s.action === 'BUY')).toBe(true);
    });

    it('filters by action=SELL', async () => {
      const res = await ctx.request
        .get('/api/v1/signals?action=SELL')
        .set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe('SELL');
    });
  });
});
