import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null, user: { id: 'github:167765989', email: 'owner@example.test' } }));
vi.mock('@/lib/cloudflarePrivate', () => ({
  privateDb: () => state.db,
  userFromSession: async () => state.user,
  parseCookies: (value) => Object.fromEntries(value.split(';').filter(Boolean).map(part => part.trim().split('='))),
}));
vi.mock('@/lib/auth', () => {
  class AuthenticationError extends Error {}
  return { AuthenticationError, authenticated: async () => { if (!state.user) throw new AuthenticationError(); return { user: state.user }; } };
});
vi.mock('@/lib/runtimeEnv', () => ({ runtimeEnv: name => ({ ABSCISSA_ADMIN_USER_IDS: 'github:167765989', ABSCISSA_ANALYTICS_ENABLED: 'true', ANALYTICS_HASH_SECRET: 'test-secret-value-with-at-least-32-characters' })[name] || '' }));

import { readAdminData, adminFilters } from '@/lib/admin/data';
import { adminSections } from '@/lib/admin/catalog';
import { requireAdmin } from '@/lib/admin/access';
import { savePost, publishedPosts } from '@/lib/admin/content';
import { observedFetch } from '@/lib/admin/telemetry';
import { cleanupAnalytics } from '@/lib/admin/retention';
import { POST as collect } from '@/app/api/analytics/events/route';
import { GET as adminGet, POST as adminPost } from '@/app/api/admin/[...section]/route';

let sqlite;
beforeEach(() => {
  state.user = { id: 'github:167765989', email: 'owner@example.test' };
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('d1/migrations/0003_private_guardrails.sql', 'utf8'));
  sqlite.exec(readFileSync('d1/migrations/0019_admin_analytics.sql', 'utf8'));
  function statement(query, values = []) {
    return {
      bind: (...bound) => statement(query, bound),
      first: async () => sqlite.prepare(query).get(...values) || null,
      all: async () => ({ results: sqlite.prepare(query).all(...values) }),
      run: async () => sqlite.prepare(query).run(...values),
    };
  }
  state.db = { prepare: statement, batch: async statements => Promise.all(statements.map(query => query.run())) };
});
afterEach(() => { sqlite.close(); vi.unstubAllGlobals(); });
const context = key => ({ params: Promise.resolve({ section: key.split('/') }) });
const request = (path, body, origin = 'https://abscissa.dev') => new Request(`https://abscissa.dev${path}`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json', 'cf-connecting-ip': '192.0.2.10' }, body: JSON.stringify(body) });
const event = { consent: 'granted', name: 'page_view', path: '/registry' };

describe('admin database and access boundary', () => {
  it('denies authenticated users who are not the configured operator', async () => {
    state.user = { id: 'github:someone-else' };
    await expect(requireAdmin(new Request('https://abscissa.dev/admin'))).rejects.toMatchObject({ status: 403 });
    expect((await adminGet(new Request('https://abscissa.dev/api/admin/users'), context('users'))).status).toBe(403);
  });
  it('denies anonymous API reads and exports without querying private data', async () => {
    state.user = null; state.db = null;
    const response = await adminGet(new Request('https://abscissa.dev/api/admin/users?format=csv'), context('users'));
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('executes the real SQL for every D1-backed section', async () => {
    const filters = adminFilters(new URLSearchParams());
    for (const section of adminSections.filter(section => section.source !== 'newsletter')) {
      const data = await readAdminData(section.key, filters);
      expect(data.rows, section.key).toEqual([]);
      expect(data.next, section.key).toBe(false);
    }
  });
  it('groups real consenting visits and distinguishes unknown bot scores', async () => {
    expect((await collect(request('/api/analytics/events', event))).status).toBe(204);
    const filters = adminFilters(new URLSearchParams());
    expect((await readAdminData('traffic/pages', filters)).rows[0]).toMatchObject({ dimension: '/registry', events: 1, sessions: 1, signed_in_users: 1 });
    expect((await readAdminData('security', filters)).rows[0].dimension).toBe('Score unavailable');
    const badFilter = adminFilters(new URLSearchParams({ q: "' OR 1=1 --" }));
    expect((await readAdminData('traffic/pages', badFilter)).rows).toEqual([]);
  });
  it('paginates real accounts and exports only the requested page', async () => {
    const now = new Date().toISOString();
    const insert = sqlite.prepare('INSERT INTO app_users VALUES(?,?,?,?,?,?,?)');
    for (let i = 0; i < 55; i++) insert.run(`u${i}`, `person${i}@example.test`, 'Person', 'github', `subject${i}`, now, now);
    const filters = adminFilters(new URLSearchParams());
    const first = await readAdminData('users/all', filters);
    expect(first.rows).toHaveLength(50); expect(first.next).toBe(true);
    const second = await readAdminData('users/all', { ...filters, page: 2 });
    expect(second.rows).toHaveLength(5); expect(second.next).toBe(false);
    const response = await adminGet(new Request('https://abscissa.dev/api/admin/users/all?format=csv&page=2'), context('users/all'));
    expect(response.status).toBe(200); expect((await response.text()).split('\r\n')).toHaveLength(6);
  });
  it('clamps dates to a valid 90 day window and rejects invalid date rollover', () => {
    const result = adminFilters(new URLSearchParams({ from: '2020-01-01', to: '2026-02-30', page: '-3' }), new Date('2026-11-25T00:00:00Z'));
    expect(result.to).toBe('2026-11-25'); expect(result.from).toBe('2026-08-28'); expect(result.page).toBe(1);
  });
});

describe('visitor collection', () => {
  it('requires consent and an exact same-origin request', async () => {
    expect((await collect(request('/api/analytics/events', { ...event, consent: 'denied' }))).status).toBe(400);
    expect((await collect(request('/api/analytics/events', event, 'https://evil.example'))).status).toBe(403);
    expect(sqlite.prepare('SELECT count(*) AS count FROM app_analytics_events').get().count).toBe(0);
  });
  it('removes secrets and payloads, strips private paths, sets a bounded HttpOnly session', async () => {
    const response = await collect(request('/api/analytics/events', { ...event, path: '/extensions/private-id/versions/secret?token=secret', referrer: 'https://example.test/private?token=secret', body: 'never retain', utm_campaign: 'person@example.test', user_id: 'attacker' }));
    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toMatch(/gr_analytics=.*HttpOnly/);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=1800');
    const row = sqlite.prepare('SELECT * FROM app_analytics_events').get();
    expect(row.path).toBe('/extensions/[detail]'); expect(row.referrer).toBe('example.test'); expect(row.user_id).toBe(state.user.id);
    expect(JSON.stringify(row)).not.toMatch(/never retain|token=secret|192\.0\.2\.10|person@example/);
  });
  it('rejects arbitrary names, admin views, oversized streams, and exhausted limits', async () => {
    expect((await collect(request('/api/analytics/events', { ...event, name: 'steal_content' }))).status).toBe(400);
    expect((await collect(request('/api/analytics/events', { ...event, path: '/admin/content' }))).status).toBe(204);
    expect((await collect(request('/api/analytics/events', { ...event, padding: 'x'.repeat(5000) }))).status).toBe(400);
    expect(sqlite.prepare('SELECT count(*) AS count FROM app_analytics_events').get().count).toBe(0);
    await collect(request('/api/analytics/events', event));
    sqlite.exec('UPDATE app_analytics_limits SET hits=2000');
    expect((await collect(request('/api/analytics/events', event))).status).toBe(429);
  });
  it('continues provider operations if telemetry storage is unavailable', async () => {
    state.db = null;
    const response = new Response('{}', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    expect(await observedFetch('sarvam', 'sarvam-105b', 'https://api.sarvam.ai', {})).toBe(response);
  });
  it('purges expired records while preserving recent activity', async () => {
    await collect(request('/api/analytics/events', event));
    sqlite.exec("INSERT INTO app_analytics_events(id,occurred_at,name) VALUES('expired','2020-01-01T00:00:00Z','page_view')");
    await cleanupAnalytics(state.db);
    expect(sqlite.prepare('SELECT count(*) AS count FROM app_analytics_events').get().count).toBe(1);
  });
});

describe('content publishing', () => {
  const article = { title: 'Extension updates', slug: 'extension-updates', summary: 'A summary', body: '# Evidence first', status: 'draft' };
  it('keeps drafts private, publishes, detects stale edits, and withdraws an article', async () => {
    let post = await savePost(article, state.user.id);
    expect(await publishedPosts()).toEqual([]);
    post = await savePost({ ...post, status: 'published' }, state.user.id);
    expect((await publishedPosts())[0].slug).toBe(article.slug);
    await expect(savePost({ ...post, version: 1 }, state.user.id)).rejects.toMatchObject({ status: 409 });
    await savePost({ ...post, status: 'draft' }, state.user.id);
    expect(await publishedPosts(article.slug)).toEqual([]);
  });
  it('rejects duplicate slugs and cross-origin publication attempts', async () => {
    await savePost(article, state.user.id);
    await expect(savePost(article, state.user.id)).rejects.toMatchObject({ status: 409 });
    expect((await adminPost(request('/api/admin/content', article, 'https://evil.example'), context('content'))).status).toBe(403);
  });
});
