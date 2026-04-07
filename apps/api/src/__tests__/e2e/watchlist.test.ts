import { setup, cleanup, AUTH_HEADER } from '../setup-e2e';
import type { TestContext } from '../setup-e2e';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setup();
}, 30_000);

afterAll(async () => {
  await cleanup();
});

describe('Watchlist API', () => {
  describe('GET /api/v1/watchlist', () => {
    it('returns 401 without auth', async () => {
      const res = await ctx.request.get('/api/v1/watchlist');
      expect(res.status).toBe(401);
    });

    it('returns empty watchlist initially', async () => {
      const res = await ctx.request.get('/api/v1/watchlist').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/watchlist', () => {
    it('adds a ticker to watchlist', async () => {
      const res = await ctx.request
        .post('/api/v1/watchlist')
        .set(AUTH_HEADER)
        .send({ ticker: 'AAPL', notes: 'Watching earnings' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('watchlist now contains the ticker', async () => {
      const res = await ctx.request.get('/api/v1/watchlist').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ticker).toBe('AAPL');
      expect(res.body.data[0].notes).toBe('Watching earnings');
    });

    it('rejects missing ticker', async () => {
      const res = await ctx.request
        .post('/api/v1/watchlist')
        .set(AUTH_HEADER)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/watchlist/:ticker', () => {
    it('removes a ticker from watchlist', async () => {
      const res = await ctx.request
        .delete('/api/v1/watchlist/AAPL')
        .set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('watchlist is empty again', async () => {
      const res = await ctx.request.get('/api/v1/watchlist').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
