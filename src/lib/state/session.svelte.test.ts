import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: { pathname: '/' } } }));
import { ApiError } from '$lib/api';
import { request } from '$lib/api/client';
import { garden } from './garden.svelte';
import { session } from './session.svelte';
import { Session } from './session.svelte';
import { ui } from './ui.svelte';

class FakeBroadcastChannel {
	static latest: FakeBroadcastChannel;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	constructor() {
		FakeBroadcastChannel.latest = this;
	}
	postMessage() {}
}

afterEach(() => vi.unstubAllGlobals());
describe('session 401 handling', () => {
	it('invalidates household data and returns to signed-out on a protected 401', async () => {
		session.user = { id: 'u1', email: 'test@example.com', name: 'Test' };
		session.households = [];
		session.householdId = 'h1';
		session.status = 'ready';
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 'private',
				name: 'Private',
				variety: '',
				company: '',
				type: 'Untyped',
				state: 'active',
				packets: 1,
				year: null,
				loc: '',
				tags: [],
				verdict: null,
				window: null,
				info: null,
				notes: '',
				catalog: false,
				version: 1,
				catalogId: null,
				source: 'store'
			}
		];
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						ok: false,
						error: { code: 'unauthorized', message: 'Sign in again' }
					}),
					{ status: 401, headers: { 'content-type': 'application/json' } }
				)
			)
		);
		await expect(request('/api/seeds')).rejects.toBeInstanceOf(ApiError);
		expect(session.status).toBe('signed-out');
		expect(session.user).toBeNull();
		expect(session.householdId).toBeNull();
		expect(garden.seeds).toEqual([]);
	});
	it('stays signed out when a protected request returns 401 during activation', async () => {
		const active = new Session();
		active.user = { id: 'u1', email: 'test@example.com', name: 'Test' };
		active.households = [{ id: 'h1', name: 'Garden', role: 'owner', joinedAt: 0 }];
		active.householdId = 'h0';
		active.status = 'ready';
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const path = new URL(String(input)).pathname;
				if (path === '/api/seeds')
					return new Response(JSON.stringify({ ok: false, error: { code: 'unauthorized' } }), {
						status: 401,
						headers: { 'content-type': 'application/json' }
					});
				return new Response(
					JSON.stringify({
						ok: true,
						data:
							path === '/api/households/me'
								? { household: { id: 'h1', name: 'Garden', location: null } }
								: { items: [], cursor: 0, has_more: false }
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' }
					}
				);
			})
		);
		await active.selectHousehold('h1');
		expect(active.status).toBe('signed-out');
		expect(active.user).toBeNull();
		expect(active.householdId).toBeNull();
	});
	it('keeps a ZIP failure notice while activating the newly created garden', async () => {
		const active = new Session();
		active.user = { id: 'u1', email: 'test@example.com', name: 'Test' };
		active.status = 'ready';
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const path = new URL(String(input)).pathname;
				if (path === '/api/households' && init?.method === 'POST')
					return new Response(
						JSON.stringify({
							ok: true,
							data: { household: { id: 'h2', name: 'New garden', created_at: 1 } }
						}),
						{
							status: 200,
							headers: { 'content-type': 'application/json' }
						}
					);
				if (path === '/api/households/me/location')
					return new Response(JSON.stringify({ ok: false, error: { code: 'zip_not_found' } }), {
						status: 404,
						headers: { 'content-type': 'application/json' }
					});
				return new Response(
					JSON.stringify({
						ok: true,
						data:
							path === '/api/households/me'
								? { household: { id: 'h2', name: 'New garden', location: null } }
								: { items: [], cursor: 0, has_more: false }
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' }
					}
				);
			})
		);
		await active.createHousehold('New garden', '00000');
		expect(active.status).toBe('ready');
		expect(active.householdId).toBe('h2');
		expect(active.notice).toContain("ZIP 00000 wasn't found");
	});
	it('validates cross-tab household membership before switching through activation', async () => {
		vi.stubGlobal('window', { addEventListener: vi.fn() });
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
		const active = new Session();
		active.user = { id: 'u1', email: 'test@example.com', name: 'Test' };
		active.households = [{ id: 'h1', name: 'First', role: 'owner', joinedAt: 0 }];
		active.householdId = 'h1';
		active.status = 'ready';
		ui.seeds.q = 'private';
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const path = new URL(String(input)).pathname;
				if (path === '/api/households')
					return new Response(
						JSON.stringify({
							ok: true,
							data: {
								households: [
									{ id: 'h1', name: 'First', role: 'owner', joined_at: 0 },
									{ id: 'h2', name: 'Second', role: 'member', joined_at: 1 }
								]
							}
						}),
						{ status: 200, headers: { 'content-type': 'application/json' } }
					);
				return new Response(
					JSON.stringify({
						ok: true,
						data:
							path === '/api/households/me'
								? { household: { id: 'h2', name: 'Second', location: null } }
								: { items: [], cursor: 0, has_more: false }
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' }
					}
				);
			})
		);
		FakeBroadcastChannel.latest.onmessage?.({
			data: { type: 'household-changed', householdId: 'h3' }
		});
		await vi.waitFor(() => expect(active.households).toHaveLength(2));
		expect(active.householdId).toBe('h1');
		FakeBroadcastChannel.latest.onmessage?.({
			data: { type: 'household-changed', householdId: 'h2' }
		});
		await vi.waitFor(() => expect(active.householdId).toBe('h2'));
		await vi.waitFor(() => expect(active.status).toBe('ready'));
		expect(active.status).toBe('ready');
		expect(ui.seeds.q).toBe('');
	});
	it('ignores household broadcasts while signed out', async () => {
		vi.stubGlobal('window', { addEventListener: vi.fn() });
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
		const active = new Session();
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		FakeBroadcastChannel.latest.onmessage?.({
			data: { type: 'household-changed', householdId: 'h2' }
		});
		await Promise.resolve();
		expect(fetch).not.toHaveBeenCalled();
	});
	it('keeps the newest local household switch when an older load finishes last', async () => {
		const active = new Session();
		active.user = { id: 'u1', email: 'test@example.com', name: 'Test' };
		active.households = [
			{ id: 'h1', name: 'First', role: 'owner', joinedAt: 0 },
			{ id: 'h2', name: 'Second', role: 'member', joinedAt: 1 },
			{ id: 'h3', name: 'Third', role: 'member', joinedAt: 2 }
		];
		active.householdId = 'h1';
		active.status = 'ready';
		const releases: (() => void)[] = [];
		const load = vi
			.spyOn(garden, 'load')
			.mockImplementation(() => new Promise<void>((resolve) => releases.push(resolve)));
		const toSecond = active.selectHousehold('h2');
		await vi.waitFor(() => expect(releases).toHaveLength(1));
		const toThird = active.selectHousehold('h3');
		await vi.waitFor(() => expect(releases).toHaveLength(2));
		releases[0]();
		await toSecond;
		expect(active.householdId).toBe('h3');
		expect(active.status).toBe('loading');
		releases[1]();
		await toThird;
		expect(active.householdId).toBe('h3');
		expect(active.status).toBe('ready');
		load.mockRestore();
	});
});
