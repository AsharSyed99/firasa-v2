import { setup, cleanup } from '../setup-e2e';
import type { TestContext } from '../setup-e2e';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setup();
}, 30_000);

afterAll(async () => {
  await cleanup();
});

describe('GET /health', () => {
  it('returns 200 with health status fields', async () => {
    const res = await ctx.request.get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      version: '2.0.0',
      database: true,
    });
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
