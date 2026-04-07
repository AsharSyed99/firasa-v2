import { setup, cleanup, AUTH_HEADER } from '../setup-e2e';
import type { TestContext } from '../setup-e2e';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setup();
}, 30_000);

afterAll(async () => {
  await cleanup();
});

describe('Gurus API', () => {
  describe('GET /api/v1/gurus', () => {
    it('returns 401 without auth', async () => {
      const res = await ctx.request.get('/api/v1/gurus');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns array of gurus with auth', async () => {
      const res = await ctx.request.get('/api/v1/gurus').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const guru = res.body.data[0];
      expect(guru).toHaveProperty('id');
      expect(guru).toHaveProperty('twitterHandle');
      expect(guru).toHaveProperty('displayName');
      expect(guru).toHaveProperty('category');
      expect(guru).toHaveProperty('reliability');
      expect(guru).toHaveProperty('winRates');
    });
  });

  describe('GET /api/v1/gurus/:id', () => {
    it('returns a single guru', async () => {
      const res = await ctx.request
        .get(`/api/v1/gurus/${ctx.testData.guru1Id}`)
        .set(AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data.twitterHandle).toBe('stockmaster');
      expect(res.body.data.displayName).toBe('Stock Master');
    });

    it('returns 404 for unknown id', async () => {
      const res = await ctx.request
        .get('/api/v1/gurus/nonexistent-id')
        .set(AUTH_HEADER);
      expect(res.status).toBe(404);
    });
  });

  describe('Follow / unfollow via PATCH /api/v1/me/gurus/:guruId', () => {
    it('follows a guru', async () => {
      const res = await ctx.request
        .patch(`/api/v1/me/gurus/${ctx.testData.guru1Id}`)
        .set(AUTH_HEADER)
        .send({ isFollowing: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFollowing).toBe(true);
      expect(res.body.data.guruId).toBe(ctx.testData.guru1Id);
    });

    it('lists followed gurus', async () => {
      const res = await ctx.request.get('/api/v1/me/gurus').set(AUTH_HEADER);

      expect(res.status).toBe(200);
      const followed = res.body.data.find(
        (g: { guruId: string }) => g.guruId === ctx.testData.guru1Id,
      );
      expect(followed).toBeDefined();
      expect(followed.isFollowing).toBe(true);
    });

    it('unfollows a guru', async () => {
      const res = await ctx.request
        .patch(`/api/v1/me/gurus/${ctx.testData.guru1Id}`)
        .set(AUTH_HEADER)
        .send({ isFollowing: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isFollowing).toBe(false);
    });
  });
});
