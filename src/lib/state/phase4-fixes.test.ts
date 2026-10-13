import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api';
import { journal } from '$lib/api';
import { clock } from './clock.svelte';
import { Garden } from './garden.svelte';

const envelope = (data: unknown) =>
	new Response(JSON.stringify({ ok: true, data }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});

const seedDto = (version = 1, notes = '') => ({
	id: 's1',
	catalog_id: 'c1',
	state: 'active',
	packet_count: 1,
	location_id: null,
	year_packed: null,
	source: 'store',
	custom_name: null,
	custom_variety: null,
	custom_company: null,
	custom_type: null,
	notes,
	tag_ids: [],
	version
});

function installGardenFetch(options: { enrichmentFails?: boolean } = {}) {
	let enrichmentFails = options.enrichmentFails ?? false;
	let dto = seedDto();
	const calls: { path: string; method: string; url: URL }[] = [];
	const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input));
		const path = url.pathname;
		const method = init?.method ?? 'GET';
		calls.push({ path, method, url });
		if (path === '/api/seeds' && method === 'GET')
			return envelope({ items: [dto], cursor: 0, has_more: false });
		if (path === '/api/seeds/s1' && method === 'PATCH') {
			dto = { ...dto, ...JSON.parse(String(init?.body)), version: dto.version + 1 };
			return envelope({ seed: dto });
		}
		if (path === '/api/seeds/s1' && method === 'GET') return envelope({ seed: dto });
		if (
			path === '/api/beds' ||
			path === '/api/locations' ||
			path === '/api/tags' ||
			path === '/api/planting-events'
		)
			return envelope({ items: [], cursor: 0, has_more: false });
		if (path === '/api/households/me')
			return envelope({ household: { id: 'h1', name: 'Garden', location: null } });
		if (path === '/api/journal') return envelope({ items: [], cursor: 0, has_more: false });
		if (path === '/api/catalog/c1') {
			if (enrichmentFails)
				return new Response(JSON.stringify({ ok: false, error: { code: 'catalog_down' } }), {
					status: 503
				});
			return envelope({
				catalog_seed: {
					id: 'c1',
					common_name: 'Catalog tomato',
					variety: 'Catalog variety',
					company: 'Catalog company',
					scientific_name: 'Solanum',
					instructions: 'Start indoors'
				}
			});
		}
		if (path === '/api/recommendations/bulk') {
			if (enrichmentFails)
				return new Response(
					JSON.stringify({ ok: false, error: { code: 'recommendations_down' } }),
					{ status: 503 }
				);
			return envelope({
				recommendations: [
					{
						catalogSeedId: 'c1',
						verdict: 'plant_now',
						recommendedRange: { start: '2026-10-01', end: '2026-10-31' }
					}
				],
				pending: []
			});
		}
		return envelope({});
	});
	vi.stubGlobal('fetch', fetch);
	return { calls, fetch, setEnrichmentFails: (value: boolean) => (enrichmentFails = value) };
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('Phase 4 enrichment, notes, and photo outcomes', () => {
	it('reconciles repeated loads through acknowledgements without starving or restoring deleted rows', async () => {
		let dto = { ...seedDto(1, 'server'), catalog_id: null };
		let loadRows: ReturnType<typeof deferred<Response>>[] = [];
		const stale = (version: number) => ({
			...dto,
			version,
			notes: version === 1 ? 'server' : version === 2 ? 'first' : 'second'
		});
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (url.pathname === '/api/seeds' && method === 'GET') {
				const reply = deferred<Response>();
				loadRows.push(reply);
				return reply.promise;
			}
			if (url.pathname === '/api/seeds/s1' && method === 'PATCH') {
				dto = { ...dto, ...JSON.parse(String(init?.body)), version: dto.version + 1 };
				return Promise.resolve(envelope({ seed: dto }));
			}
			if (
				url.pathname === '/api/beds' ||
				url.pathname === '/api/locations' ||
				url.pathname === '/api/tags' ||
				url.pathname === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(
					envelope({ household: { id: 'h1', name: 'Garden', location: null } })
				);
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Seed',
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
			},
			{
				id: 's2',
				name: 'Remote row',
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
		const firstLoad = garden.load();
		await vi.waitFor(() => expect(loadRows).toHaveLength(1));
		expect(await garden.updateSeed('s1', { notes: 'first' })).toBe(true);
		loadRows[0].resolve(
			envelope({
				items: [stale(1), { ...seedDto(1), id: 's2', catalog_id: null }],
				cursor: 0,
				has_more: false
			})
		);
		await firstLoad;
		expect(garden.seeds.find((seed) => seed.id === 's1')).toMatchObject({
			notes: 'first',
			version: 2
		});

		const secondLoad = garden.load();
		await vi.waitFor(() => expect(loadRows).toHaveLength(2));
		expect(await garden.updateSeed('s1', { notes: 'second' })).toBe(true);
		loadRows[1].resolve(envelope({ items: [stale(2)], cursor: 0, has_more: false }));
		await secondLoad;
		expect(garden.seeds.map((seed) => seed.id)).toEqual(['s1']);
		expect(garden.seeds[0]).toMatchObject({ notes: 'second', version: 3 });

		const finalLoad = garden.load();
		await vi.waitFor(() => expect(loadRows).toHaveLength(3));
		loadRows[2].resolve(envelope({ items: [dto], cursor: 0, has_more: false }));
		await finalLoad;
		expect(garden.seeds[0]).toMatchObject({ notes: 'second', version: 3 });
		expect(loadRows).toHaveLength(3);
	});

	it('drops older loads after a newer baseline has applied', async () => {
		let releases: ((response: Response) => void)[] = [];
		let call = 0;
		const fetch = vi.fn((input: RequestInfo | URL) => {
			const path = new URL(String(input)).pathname;
			if (path === '/api/seeds') {
				call++;
				return new Promise<Response>((resolve) => releases.push(resolve));
			}
			if (path === '/api/households/me')
				return Promise.resolve(
					envelope({ household: { id: 'h1', name: 'Garden', location: null } })
				);
			if (
				path === '/api/journal' ||
				path === '/api/beds' ||
				path === '/api/locations' ||
				path === '/api/tags' ||
				path === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const older = garden.load();
		await vi.waitFor(() => expect(call).toBe(1));
		const newer = garden.load();
		await vi.waitFor(() => expect(call).toBe(2));
		releases[1](
			envelope({ items: [{ ...seedDto(2, 'new'), catalog_id: null }], cursor: 0, has_more: false })
		);
		await newer;
		releases[0](
			envelope({ items: [{ ...seedDto(1, 'old'), catalog_id: null }], cursor: 0, has_more: false })
		);
		await older;
		expect(garden.seeds[0]).toMatchObject({ notes: 'new', version: 2 });
	});

	it('clears an older acknowledged delete marker when a later baseline includes the record', async () => {
		const eventDto = {
			id: 'e1',
			bed_id: 'b1',
			seed_id: 's1',
			kind: 'sowing',
			planned_for: '2026-10-10',
			completed_at: null,
			x_feet: 0,
			y_feet: 0,
			notes: '',
			version: 2
		};
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (url.pathname === '/api/planting-events/e1' && method === 'DELETE')
				return Promise.resolve(envelope({ id: 'e1', deleted: true }));
			if (url.pathname === '/api/planting-events')
				return Promise.resolve(envelope({ items: [eventDto], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(
					envelope({ household: { id: 'h1', name: 'Garden', location: null } })
				);
			if (
				url.pathname === '/api/seeds' ||
				url.pathname === '/api/beds' ||
				url.pathname === '/api/locations' ||
				url.pathname === '/api/tags'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.events = [
			{
				id: 'e1',
				bed: 'b1',
				seed: 's1',
				kind: 'sowing',
				date: '2026-10-10',
				done: false,
				x: 0,
				y: 0,
				notes: '',
				version: 1
			}
		];
		expect(await garden.removeEvent('e1')).toBe(true);
		expect(garden.events).toEqual([]);
		await garden.load();
		expect(garden.events).toMatchObject([{ id: 'e1', version: 2 }]);
	});

	it('ignores enrichment responses from older load sequences', async () => {
		const catalogReplies: ((response: Response) => void)[] = [];
		const recommendationReplies: ((response: Response) => void)[] = [];
		const fetch = vi.fn((input: RequestInfo | URL) => {
			const path = new URL(String(input)).pathname;
			if (path === '/api/seeds')
				return Promise.resolve(envelope({ items: [seedDto()], cursor: 0, has_more: false }));
			if (path === '/api/catalog/c1')
				return new Promise<Response>((resolve) => catalogReplies.push(resolve));
			if (path === '/api/recommendations/bulk' && recommendationReplies.length >= 2)
				return Promise.resolve(envelope({ recommendations: [], pending: [] }));
			if (path === '/api/recommendations/bulk')
				return new Promise<Response>((resolve) => recommendationReplies.push(resolve));
			if (path === '/api/households/me')
				return Promise.resolve(
					envelope({ household: { id: 'h1', name: 'Garden', location: null } })
				);
			if (
				path === '/api/journal' ||
				path === '/api/beds' ||
				path === '/api/locations' ||
				path === '/api/tags' ||
				path === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const older = garden.load();
		await vi.waitFor(() => expect(catalogReplies).toHaveLength(1));
		const newer = garden.load();
		await vi.waitFor(() => expect(catalogReplies).toHaveLength(2));
		catalogReplies[0](envelope({ catalog_seed: { id: 'c1', common_name: 'Old catalog' } }));
		await vi.waitFor(() => expect(recommendationReplies).toHaveLength(1));
		catalogReplies[1](envelope({ catalog_seed: { id: 'c1', common_name: 'New catalog' } }));
		await vi.waitFor(() => expect(recommendationReplies).toHaveLength(2));
		recommendationReplies[1](
			envelope({
				recommendations: [{ catalogSeedId: 'c1', verdict: 'too_late', recommendedRange: null }],
				pending: []
			})
		);
		await newer;
		recommendationReplies[0](
			envelope({
				recommendations: [{ catalogSeedId: 'c1', verdict: 'plant_now', recommendedRange: null }],
				pending: []
			})
		);
		await older;
		await garden.load();
		expect(garden.seeds[0]).toMatchObject({ name: 'New catalog', verdict: 'too_late' });
	});
	it('ignores an older recommendation after a newer response marks the catalog pending', async () => {
		const realSetTimeout = globalThis.setTimeout.bind(globalThis);
		const recommendationTimers: (() => void)[] = [];
		vi.stubGlobal('setTimeout', ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
			if (timeout === 5000 && typeof handler === 'function') {
				recommendationTimers.push(handler as () => void);
				return 0 as unknown as ReturnType<typeof setTimeout>;
			}
			return realSetTimeout(handler, timeout, ...args);
		}) as typeof setTimeout);
		const catalogReplies: ((response: Response) => void)[] = [];
		const recommendationReplies: ((response: Response) => void)[] = [];
		let recommendationCalls = 0;
		const fetch = vi.fn((input: RequestInfo | URL) => {
			const path = new URL(String(input)).pathname;
			if (path === '/api/seeds')
				return Promise.resolve(envelope({ items: [seedDto()], cursor: 0, has_more: false }));
			if (path === '/api/catalog/c1')
				return new Promise<Response>((resolve) => catalogReplies.push(resolve));
			if (path === '/api/recommendations/bulk' && ++recommendationCalls > 2)
				return Promise.resolve(envelope({ recommendations: [], pending: [] }));
			if (path === '/api/recommendations/bulk')
				return new Promise<Response>((resolve) => recommendationReplies.push(resolve));
			if (path === '/api/households/me')
				return Promise.resolve(
					envelope({ household: { id: 'h1', name: 'Garden', location: null } })
				);
			if (
				path === '/api/journal' ||
				path === '/api/beds' ||
				path === '/api/locations' ||
				path === '/api/tags' ||
				path === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const older = garden.load();
		await vi.waitFor(() => expect(catalogReplies).toHaveLength(1));
		const newer = garden.load();
		await vi.waitFor(() => expect(catalogReplies).toHaveLength(2));
		catalogReplies[0](envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
		catalogReplies[1](envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
		await vi.waitFor(() => expect(recommendationReplies).toHaveLength(2));
		recommendationReplies[1](envelope({ recommendations: [], pending: ['c1'] }));
		await newer;
		recommendationReplies[0](
			envelope({
				recommendations: [{ catalogSeedId: 'c1', verdict: 'plant_now', recommendedRange: null }],
				pending: []
			})
		);
		await older;
		await garden.load();
		expect(garden.seeds[0].verdict).not.toBe('plant_now');
		expect(recommendationTimers).toHaveLength(1);
	});

	function deferred<T>() {
		let resolve!: (value: T) => void;
		const promise = new Promise<T>((done) => (resolve = done));
		return { promise, resolve };
	}
	it('keeps catalog and recommendation enrichment on server write acknowledgements', async () => {
		const { calls, setEnrichmentFails } = installGardenFetch();
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		await garden.load();
		expect(garden.seeds[0]).toMatchObject({
			name: 'Catalog tomato',
			variety: 'Catalog variety',
			company: 'Catalog company',
			verdict: 'plant_now',
			window: ['2026-10-01', '2026-10-31'],
			catalog: true
		});
		setEnrichmentFails(true);
		expect(await garden.updateSeed('s1', { notes: 'A note' })).toBe(true);
		expect(garden.seeds[0]).toMatchObject({
			name: 'Catalog tomato',
			variety: 'Catalog variety',
			company: 'Catalog company',
			verdict: 'plant_now',
			notes: 'A note'
		});
		expect(calls.filter((call) => call.path === '/api/catalog/c1')).toHaveLength(1);
	});
	it('keeps seed loads usable when catalog or recommendation enrichment is unavailable', async () => {
		installGardenFetch({ enrichmentFails: true });
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		await expect(garden.load()).resolves.toBeUndefined();
		expect(garden.loadError).toBe('');
		expect(garden.seeds[0]).toMatchObject({ name: 'Untitled seed', type: 'Untyped' });
	});
	it('ignores blank and future journal rows and chooses the latest valid note', async () => {
		clock.setToday('2026-10-12');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				envelope({
					items: [
						{ id: 'future', occurredOn: '2026-10-13', body: 'Future' },
						{ id: 'blank', occurredOn: '2026-10-12', body: '  \n ' },
						{ id: 'today', occurredOn: '2026-10-12', body: 'Today note' },
						{ id: 'old', occurredOn: '2026-10-11', body: 'Older note' }
					],
					cursor: 0,
					has_more: false
				})
			)
		);
		expect(await journal.latest()).toEqual({ date: '2026-10-12', body: 'Today note' });
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				envelope({
					items: [{ id: 'blank', occurredOn: '2026-10-12', body: '  ' }],
					cursor: 0,
					has_more: false
				})
			)
		);
		expect(await journal.latest()).toBeNull();
	});
	it('reconciles ambiguous photo uploads by the stable client id and refetches seed version', async () => {
		const calls: { path: string; method: string; url: URL }[] = [];
		const clientIds: string[] = [];
		let uploadCount = 0;
		let committed = false;
		const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const path = url.pathname;
			const method = init?.method ?? 'GET';
			calls.push({ path, method, url });
			if (path === '/api/seeds/s1/photos' && method === 'POST') {
				uploadCount++;
				clientIds.push(url.searchParams.get('id')!);
				if (uploadCount <= 2) {
					if (uploadCount === 2) committed = true;
					throw new Error('response lost');
				}
				return envelope({
					photo: { id: clientIds.at(-1), seed_id: 's1', role: 'front', captured_at: 1 }
				});
			}
			if (path === '/api/seeds/s1/photos')
				return envelope({
					photos: committed ? [{ id: clientIds[0], seed_id: 's1', role: 'front' }] : []
				});
			if (path === '/api/seeds/s1') return envelope({ seed: { ...seedDto(4), catalog_id: null } });
			return envelope({});
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Seed',
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
				version: 3,
				catalogId: null,
				source: 'store'
			}
		];
		const photo = await garden.uploadSeedPhoto(
			's1',
			new Blob(['image'], { type: 'image/png' }),
			'front'
		);
		expect(photo.id).toBe(clientIds[0]);
		expect(uploadCount).toBe(2);
		expect(new Set(clientIds).size).toBe(1);
		expect(
			calls.some((call) => call.path === '/api/seeds/s1/photos' && call.method === 'GET')
		).toBe(true);
		expect(calls.some((call) => call.path === '/api/seeds/s1' && call.method === 'GET')).toBe(true);
	});
	it('does not apply a delayed conflict enrichment after switching households', async () => {
		let releaseCatalog!: (response: Response) => void;
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === '/api/seeds/s1' && init?.method === 'PATCH')
					return Promise.resolve(
						new Response(
							JSON.stringify({
								ok: false,
								error: { code: 'version_conflict', data: { current: seedDto(8, 'Other') } }
							}),
							{ status: 409, headers: { 'content-type': 'application/json' } }
						)
					);
				if (url.pathname === '/api/catalog/c1')
					return new Promise<Response>((resolve) => (releaseCatalog = resolve));
				return originalFetch(input, init);
			})
		);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Before',
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
				catalogId: 'c1',
				source: 'store'
			}
		];
		const update = garden.updateSeed('s1', { name: 'Mine' });
		await vi.waitFor(() => expect(releaseCatalog).toBeTypeOf('function'));
		garden.setIdentity('u1', 'h2');
		releaseCatalog(envelope({ catalog_seed: { id: 'c1', common_name: 'Catalog' } }));
		await expect(update).resolves.toBe(false);
		expect(garden.seeds).toEqual([]);
	});
	it('uses the acknowledged version when an update queues during ack enrichment', async () => {
		let releaseCatalog!: (response: Response) => void;
		const versions: string[] = [];
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/seeds/s1' && init?.method === 'PATCH') {
				versions.push(new Headers(init.headers).get('If-Match') ?? '');
				const version = Number(versions.at(-1)) + 1;
				return Promise.resolve(
					envelope({
						seed: { ...seedDto(version), custom_name: version === 2 ? 'First' : 'Second' }
					})
				);
			}
			if (url.pathname === '/api/catalog/c1')
				return new Promise<Response>((resolve) => (releaseCatalog = resolve));
			if (url.pathname === '/api/recommendations/bulk')
				return Promise.resolve(envelope({ recommendations: [], pending: ['c1'] }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Before',
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
				catalog: true,
				version: 1,
				catalogId: 'c1',
				source: 'store'
			}
		];
		const first = garden.updateSeed('s1', { notes: 'first' });
		await vi.waitFor(() => expect(releaseCatalog).toBeTypeOf('function'));
		const second = garden.updateSeed('s1', { notes: 'second' });
		releaseCatalog(envelope({ catalog_seed: { id: 'c1', common_name: 'Catalog' } }));
		expect(await first).toBe(false);
		expect(await second).toBe(true);
		expect(versions).toEqual(['1', '2']);
	});
	it('does not apply stale recommendation retry results after a seed edit', async () => {
		const realSetTimeout = globalThis.setTimeout.bind(globalThis);
		const recommendationTimers: (() => void)[] = [];
		vi.stubGlobal('setTimeout', ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
			if (timeout === 5000 && typeof handler === 'function') {
				recommendationTimers.push(handler as () => void);
				return 0 as unknown as ReturnType<typeof setTimeout>;
			}
			return realSetTimeout(handler, timeout, ...args);
		}) as typeof setTimeout);
		let recommendationCalls = 0;
		let releaseRetry!: (response: Response) => void;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
				return Promise.resolve(envelope({ items: [seedDto()], cursor: 0, has_more: false }));
			if (url.pathname === '/api/seeds/s1' && init?.method === 'PATCH')
				return Promise.resolve(envelope({ seed: { ...seedDto(2), notes: 'new note' } }));
			if (url.pathname === '/api/catalog/c1')
				return Promise.resolve(envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
			if (url.pathname === '/api/recommendations/bulk') {
				recommendationCalls++;
				if (recommendationCalls === 1)
					return Promise.resolve(envelope({ recommendations: [], pending: ['c1'] }));
				if (recommendationCalls === 2)
					return new Promise<Response>((resolve) => (releaseRetry = resolve));
				return Promise.resolve(envelope({ recommendations: [], pending: ['c1'] }));
			}
			if (
				url.pathname === '/api/beds' ||
				url.pathname === '/api/locations' ||
				url.pathname === '/api/tags' ||
				url.pathname === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(envelope({ household: { id: 'h1', name: 'Garden' } }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		await garden.load();
		expect(garden.pendingRecommendations).toContain('c1');
		expect(recommendationTimers).toHaveLength(1);
		recommendationTimers[0]();
		await vi.waitFor(() => expect(releaseRetry).toBeTypeOf('function'));
		expect(await garden.updateSeed('s1', { notes: 'new note' })).toBe(true);
		releaseRetry(
			envelope({
				recommendations: [{ catalogSeedId: 'c1', verdict: 'skip', recommendedRange: null }],
				pending: []
			})
		);
		await vi.waitFor(() => expect(garden.pendingRecommendations).toEqual(new Set(['c1'])));
		expect(garden.seeds[0]).toMatchObject({ notes: 'new note', verdict: null });
	}, 10000);
	it('keeps a failed optimistic record protected when its reconcile load fails', async () => {
		installGardenFetch();
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const seed = await garden.addSeed({ name: 'Server' });
		const originalFetch = globalThis.fetch;
		let failLoads = true;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === `/api/seeds/${seed.id}` && init?.method === 'PATCH')
					return Promise.resolve(new Response('{}', { status: 500 }));
				if (failLoads && url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
					return Promise.resolve(new Response('{}', { status: 503 }));
				return originalFetch(input, init);
			})
		);
		expect(await garden.updateSeed(seed.id, { name: 'Optimistic' })).toBe(false);
		expect(garden.seeds[0].name).toBe('Optimistic');
		failLoads = false;
		await garden.load();
		expect(garden.seeds[0].name).toBe('Catalog tomato');
	});
	it('does not apply a photo version response after a newer seed update', async () => {
		let releaseVersion!: (response: Response) => void;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/seeds/s1/photos' && init?.method === 'POST')
				return Promise.resolve(
					envelope({
						photo: { id: 'p1', seed_id: 's1', role: 'front', captured_at: 1 }
					})
				);
			if (url.pathname === '/api/seeds/s1' && (init?.method ?? 'GET') === 'GET')
				return new Promise<Response>((resolve) => (releaseVersion = resolve));
			if (url.pathname === '/api/seeds/s1' && init?.method === 'PATCH')
				return Promise.resolve(
					envelope({ seed: { ...seedDto(6), catalog_id: null, custom_name: 'Newest' } })
				);
			return Promise.resolve(envelope({ photos: [] }));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Before',
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
				version: 3,
				catalogId: null,
				source: 'store'
			}
		];
		const upload = garden.uploadSeedPhoto(
			's1',
			new Blob(['image'], { type: 'image/png' }),
			'front'
		);
		await vi.waitFor(() => expect(releaseVersion).toBeTypeOf('function'));
		expect(await garden.updateSeed('s1', { name: 'Newest' })).toBe(true);
		releaseVersion(envelope({ seed: { ...seedDto(4), catalog_id: null, custom_name: 'Older' } }));
		await upload;
		expect(garden.seeds[0]).toMatchObject({ name: 'Newest', version: 6 });
	});
	it('rejects a photo version response older than a baseline received during enrichment', async () => {
		let releaseRecommendation!: (response: Response) => void;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/seeds/s1/photos' && init?.method === 'POST')
				return Promise.resolve(
					envelope({ photo: { id: 'p1', seed_id: 's1', role: 'front', captured_at: 1 } })
				);
			if (url.pathname === '/api/seeds/s1' && (init?.method ?? 'GET') === 'GET')
				return Promise.resolve(envelope({ seed: seedDto(4) }));
			if (url.pathname === '/api/catalog/c1')
				return Promise.resolve(envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
			if (url.pathname === '/api/recommendations/bulk')
				return new Promise<Response>((resolve) => (releaseRecommendation = resolve));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Before',
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
				version: 3,
				catalogId: 'c1',
				source: 'store'
			}
		];
		const upload = garden.uploadSeedPhoto(
			's1',
			new Blob(['image'], { type: 'image/png' }),
			'front'
		);
		await vi.waitFor(() => expect(releaseRecommendation).toBeTypeOf('function'));
		garden.seeds = garden.seeds.map((seed) => ({ ...seed, name: 'New baseline', version: 5 }));
		releaseRecommendation(envelope({ recommendations: [], pending: [] }));
		await upload;
		expect(garden.seeds[0]).toMatchObject({ name: 'New baseline', version: 5 });
	});
	it('keeps ZIP recommendations when an older load recommendation response finishes later', async () => {
		let releaseLoadRecommendation!: (response: Response) => void;
		let recommendationCalls = 0;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
				return Promise.resolve(envelope({ items: [seedDto()], cursor: 0, has_more: false }));
			if (url.pathname === '/api/catalog/c1')
				return Promise.resolve(envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
			if (url.pathname === '/api/recommendations/bulk') {
				recommendationCalls++;
				if (recommendationCalls === 1)
					return new Promise<Response>((resolve) => (releaseLoadRecommendation = resolve));
				return Promise.resolve(
					envelope({
						recommendations: [
							{
								catalogSeedId: 'c1',
								verdict: 'plant_now',
								recommendedRange: { start: '2026-10-10', end: '2026-10-20' }
							}
						],
						pending: []
					})
				);
			}
			if (url.pathname === '/api/households/me/location' && init?.method === 'PUT')
				return Promise.resolve(envelope({ zip: '12345', usdaZone: '6a' }));
			if (
				url.pathname === '/api/beds' ||
				url.pathname === '/api/locations' ||
				url.pathname === '/api/tags' ||
				url.pathname === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(envelope({ household: { id: 'h1', name: 'Garden' } }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Tomato',
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
				catalogId: 'c1',
				source: 'store'
			}
		];
		const load = garden.load();
		await vi.waitFor(() => expect(releaseLoadRecommendation).toBeTypeOf('function'));
		await expect(garden.saveZip('12345')).resolves.toBe(true);
		expect(garden.seeds[0]).toMatchObject({
			verdict: 'plant_now',
			window: ['2026-10-10', '2026-10-20']
		});
		releaseLoadRecommendation(
			envelope({
				recommendations: [{ catalogSeedId: 'c1', verdict: 'skip', recommendedRange: null }],
				pending: []
			})
		);
		await load;
		expect(garden.seeds[0]).toMatchObject({
			verdict: 'plant_now',
			window: ['2026-10-10', '2026-10-20']
		});
	});
	it('keeps ZIP recommendations for a seed with a write in flight and ignores its older load response', async () => {
		let releaseLoadRecommendation!: (response: Response) => void;
		let releaseSeedWrite!: (response: Response) => void;
		let recommendationCalls = 0;
		let seedResponse = seedDto();
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (url.pathname === '/api/seeds' && method === 'GET')
				return Promise.resolve(envelope({ items: [seedResponse], cursor: 0, has_more: false }));
			if (url.pathname === '/api/seeds/s1' && method === 'PATCH')
				return new Promise<Response>((resolve) => (releaseSeedWrite = resolve));
			if (url.pathname === '/api/catalog/c1')
				return Promise.resolve(envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
			if (url.pathname === '/api/recommendations/bulk') {
				recommendationCalls++;
				if (recommendationCalls === 1)
					return new Promise<Response>((resolve) => (releaseLoadRecommendation = resolve));
				if (recommendationCalls === 2)
					return Promise.resolve(
						envelope({
							recommendations: [
								{
									catalogSeedId: 'c1',
									verdict: 'too_late',
									recommendedRange: null
								}
							],
							pending: []
						})
					);
				return Promise.resolve(envelope({ recommendations: [], pending: [] }));
			}
			if (url.pathname === '/api/households/me/location' && method === 'PUT')
				return Promise.resolve(envelope({ zip: '12345', usdaZone: '6a' }));
			if (
				url.pathname === '/api/beds' ||
				url.pathname === '/api/locations' ||
				url.pathname === '/api/tags' ||
				url.pathname === '/api/planting-events'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(envelope({ household: { id: 'h1', name: 'Garden' } }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Tomato',
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
				catalogId: 'c1',
				source: 'store'
			}
		];
		const load = garden.load();
		await vi.waitFor(() => expect(releaseLoadRecommendation).toBeTypeOf('function'));
		const write = garden.updateSeed('s1', { notes: 'in flight' });
		await vi.waitFor(() => expect(releaseSeedWrite).toBeTypeOf('function'));
		await expect(garden.saveZip('12345')).resolves.toBe(true);
		expect(garden.seeds[0].verdict).toBeNull();
		seedResponse = { ...seedResponse, notes: 'in flight', version: 2 };
		releaseSeedWrite(envelope({ seed: seedResponse }));
		await expect(write).resolves.toBe(true);
		expect(garden.seeds[0]).toMatchObject({ verdict: 'too_late', window: null });
		releaseLoadRecommendation(
			envelope({
				recommendations: [{ catalogSeedId: 'c1', verdict: 'plant_now', recommendedRange: null }],
				pending: []
			})
		);
		await load;
		expect(garden.seeds[0]).toMatchObject({ verdict: 'too_late', window: null });
	});

	const cascadeSeed = (locationId: string | null = null, tagIds: string[] = []) => ({
		...seedDto(1),
		catalog_id: null,
		location_id: locationId,
		tag_ids: tagIds
	});
	const cascadeEvent: {
		id: string;
		bed_id: string | null;
		seed_id: string | null;
		kind: string;
		planned_for: string;
		completed_at: string | null;
		x_feet: number | null;
		y_feet: number | null;
		notes: string;
		version: number;
	} = {
		id: 'e1',
		bed_id: null,
		seed_id: 's1',
		kind: 'sowing',
		planned_for: '2026-10-10',
		completed_at: null,
		x_feet: null,
		y_feet: null,
		notes: '',
		version: 1
	};
	const installCascadeLoad = (
		rows: {
			seed?: ReturnType<typeof cascadeSeed>;
			event?: typeof cascadeEvent;
			location?: { id: string; name: string; version: number };
			tag?: { id: string; name: string; version: number };
		},
		deletePath: string,
		deleteFails = false
	) => {
		let baselineSeeds!: (response: Response) => void;
		let baselineEvents!: (response: Response) => void;
		let seedLoads = 0;
		let eventLoads = 0;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (url.pathname === deletePath && method === 'DELETE')
				return Promise.resolve(
					deleteFails ? new Response('{}', { status: 500 }) : envelope({ deleted: true })
				);
			if (url.pathname === '/api/seeds' && method === 'GET') {
				seedLoads++;
				if (seedLoads === 1) return new Promise<Response>((resolve) => (baselineSeeds = resolve));
				if (deleteFails)
					return Promise.resolve(
						envelope({ items: rows.seed ? [rows.seed] : [], cursor: 0, has_more: false })
					);
				return Promise.resolve(new Response('{}', { status: 503 }));
			}
			if (url.pathname === '/api/planting-events' && method === 'GET') {
				eventLoads++;
				if (eventLoads === 1) return new Promise<Response>((resolve) => (baselineEvents = resolve));
				if (deleteFails)
					return Promise.resolve(
						envelope({ items: rows.event ? [rows.event] : [], cursor: 0, has_more: false })
					);
				return Promise.resolve(new Response('{}', { status: 503 }));
			}
			const listKey =
				url.pathname === '/api/beds'
					? undefined
					: url.pathname === '/api/locations'
						? 'location'
						: url.pathname === '/api/tags'
							? 'tag'
							: undefined;
			if (listKey) {
				const row = rows[listKey];
				return Promise.resolve(envelope({ items: row ? [row] : [], cursor: 0, has_more: false }));
			}
			if (url.pathname === '/api/beds')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(envelope({ household: { id: 'h1', name: 'Garden' } }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		return {
			fetch,
			resolveBaseline: () => {
				baselineSeeds(
					envelope({ items: rows.seed ? [rows.seed] : [], cursor: 0, has_more: false })
				);
				baselineEvents(
					envelope({ items: rows.event ? [rows.event] : [], cursor: 0, has_more: false })
				);
			}
		};
	};
	const installDeleteRace = (
		kind: 'bed' | 'location',
		rows: {
			seed?: ReturnType<typeof cascadeSeed>;
			event?: typeof cascadeEvent;
			bed?: {
				id: string;
				name: string;
				description: string;
				width_feet: number;
				length_feet: number;
				version: number;
			};
			location?: { id: string; name: string; version: number };
		}
	) => {
		const targetPath = kind === 'bed' ? '/api/beds' : '/api/locations';
		const targetId = kind === 'bed' ? 'b1' : 'l1';
		const deletePath = `${targetPath}/${targetId}`;
		const updatePath = deletePath;
		const holdPaths = new Set(['/api/seeds', '/api/planting-events', targetPath]);
		const reads = new Map<string, number>();
		const baselineReleases = new Map<string, (response: Response) => void>();
		let releaseDelete!: (response: Response) => void;
		let targetDto = rows[kind]!;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (url.pathname === updatePath && method === 'PATCH') {
				const version = (targetDto.version ?? 1) + 1;
				targetDto = { ...targetDto, ...JSON.parse(String(init?.body)), version };
				return Promise.resolve(envelope({ [kind]: targetDto }));
			}
			if (url.pathname === deletePath && method === 'DELETE')
				return new Promise<Response>((resolve) => (releaseDelete = resolve));
			if (
				url.pathname === '/api/seeds' ||
				url.pathname === '/api/planting-events' ||
				url.pathname === targetPath
			) {
				const count = (reads.get(url.pathname) ?? 0) + 1;
				reads.set(url.pathname, count);
				if (count > 2) return Promise.resolve(new Response('{}', { status: 503 }));
				const items =
					url.pathname === '/api/seeds'
						? rows.seed
							? [rows.seed]
							: []
						: url.pathname === '/api/planting-events'
							? rows.event
								? [rows.event]
								: []
							: [targetDto];
				if (count === 2 && holdPaths.has(url.pathname))
					return new Promise<Response>((resolve) => baselineReleases.set(url.pathname, resolve));
				return Promise.resolve(envelope({ items, cursor: 0, has_more: false }));
			}
			if (
				url.pathname === '/api/beds' ||
				url.pathname === '/api/locations' ||
				url.pathname === '/api/tags'
			)
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/households/me')
				return Promise.resolve(envelope({ household: { id: 'h1', name: 'Garden' } }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		return {
			fetch,
			waitForBaseline: () => vi.waitFor(() => expect(baselineReleases.size).toBe(holdPaths.size)),
			resolveBaseline: () => {
				const itemsByPath: Record<string, unknown[]> = {
					'/api/seeds': rows.seed ? [rows.seed] : [],
					'/api/planting-events': rows.event ? [rows.event] : [],
					[targetPath]: [targetDto]
				};
				for (const path of holdPaths)
					baselineReleases.get(path)?.(
						envelope({ items: itemsByPath[path], cursor: 0, has_more: false })
					);
			},
			resolveDelete: () => releaseDelete(envelope({ deleted: true }))
		};
	};

	it('sanitizes a delayed load after a seed delete acknowledgement when refresh fails', async () => {
		const fixture = installCascadeLoad(
			{ seed: cascadeSeed(), event: cascadeEvent },
			'/api/seeds/s1'
		);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const load = garden.load();
		await vi.waitFor(() => expect(fixture.fetch.mock.calls.length).toBeGreaterThan(0));
		await expect(garden.removeSeeds(['s1'])).resolves.toEqual([true]);
		fixture.resolveBaseline();
		await load;
		expect(garden.seeds).toEqual([]);
		expect(garden.events).toEqual([]);
	});
	it('keeps seed children sanitized when a load races an in-flight delete after an earlier write ack', async () => {
		let seedReads = 0;
		let eventReads = 0;
		let locationReads = 0;
		let releaseBaselineSeeds!: (response: Response) => void;
		let releaseBaselineEvents!: (response: Response) => void;
		let releaseDelete!: (response: Response) => void;
		let dto = cascadeSeed();
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (url.pathname === '/api/seeds/s1' && method === 'PATCH') {
				dto = { ...dto, ...JSON.parse(String(init?.body)), version: dto.version + 1 };
				return Promise.resolve(envelope({ seed: dto }));
			}
			if (url.pathname === '/api/seeds/s1' && method === 'DELETE')
				return new Promise<Response>((resolve) => (releaseDelete = resolve));
			if (url.pathname === '/api/seeds' && method === 'GET') {
				seedReads++;
				if (seedReads === 1)
					return Promise.resolve(envelope({ items: [dto], cursor: 0, has_more: false }));
				if (seedReads === 2)
					return new Promise<Response>((resolve) => (releaseBaselineSeeds = resolve));
				return Promise.resolve(new Response('{}', { status: 503 }));
			}
			if (url.pathname === '/api/planting-events' && method === 'GET') {
				eventReads++;
				if (eventReads === 1)
					return Promise.resolve(envelope({ items: [cascadeEvent], cursor: 0, has_more: false }));
				if (eventReads === 2)
					return new Promise<Response>((resolve) => (releaseBaselineEvents = resolve));
				return Promise.resolve(new Response('{}', { status: 503 }));
			}
			if (url.pathname === '/api/beds' || url.pathname === '/api/tags')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			if (url.pathname === '/api/locations') {
				locationReads++;
				return Promise.resolve(
					envelope({
						items: locationReads === 2 ? [{ id: 'l2', name: 'Merged baseline', version: 1 }] : [],
						cursor: 0,
						has_more: false
					})
				);
			}
			if (url.pathname === '/api/households/me')
				return Promise.resolve(envelope({ household: { id: 'h1', name: 'Garden' } }));
			if (url.pathname === '/api/journal')
				return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		await garden.load();
		expect(garden.events.map((event) => event.id)).toEqual(['e1']);
		await expect(garden.updateSeed('s1', { notes: 'write ack' })).resolves.toBe(true);
		const load = garden.load();
		await vi.waitFor(() => expect(releaseBaselineSeeds).toBeTypeOf('function'));
		const deleting = garden.removeSeeds(['s1']);
		await vi.waitFor(() => expect(releaseDelete).toBeTypeOf('function'));
		releaseBaselineSeeds(envelope({ items: [dto], cursor: 0, has_more: false }));
		releaseBaselineEvents(envelope({ items: [cascadeEvent], cursor: 0, has_more: false }));
		await load;
		expect(garden.locations.map((location) => location.name)).toEqual(['Merged baseline']);
		releaseDelete(envelope({ deleted: true }));
		await vi.waitFor(() => expect(seedReads).toBe(3));
		await deleting;
		expect(garden.events).toEqual([]);
	});
	it('keeps bed child events sanitized when a load races an in-flight bed delete after an earlier write ack', async () => {
		const fixture = installDeleteRace('bed', {
			seed: cascadeSeed(),
			event: { ...cascadeEvent, bed_id: 'b1', seed_id: null },
			bed: {
				id: 'b1',
				name: 'Raised bed',
				description: '',
				width_feet: 4,
				length_feet: 8,
				version: 1
			}
		});
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		await garden.load();
		await expect(garden.updateBed('b1', { name: 'Updated bed' })).resolves.toBe(true);
		const load = garden.load();
		await fixture.waitForBaseline();
		const deleting = garden.removeBed('b1');
		await vi.waitFor(() =>
			expect(
				fixture.fetch.mock.calls.some(
					([input, init]) => String(input).endsWith('/api/beds/b1') && init?.method === 'DELETE'
				)
			).toBe(true)
		);
		fixture.resolveBaseline();
		await load;
		fixture.resolveDelete();
		await deleting;
		expect(garden.events).toEqual([]);
	});
	it('clears a renamed location from a seed when a load races its in-flight delete', async () => {
		const fixture = installDeleteRace('location', {
			seed: cascadeSeed('l1'),
			location: { id: 'l1', name: 'Bedside', version: 1 }
		});
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		await garden.load();
		await expect(garden.updateLocation('l1', 'Renamed')).resolves.toBe(true);
		const load = garden.load();
		await fixture.waitForBaseline();
		const deleting = garden.removeLocation('l1');
		await vi.waitFor(() =>
			expect(
				fixture.fetch.mock.calls.some(
					([input, init]) =>
						String(input).endsWith('/api/locations/l1') && init?.method === 'DELETE'
				)
			).toBe(true)
		);
		fixture.resolveBaseline();
		await load;
		fixture.resolveDelete();
		await deleting;
		expect(garden.seeds[0].loc).toBe('');
	});
	it('clears a deleted location from a seed restored by a delayed load', async () => {
		const fixture = installCascadeLoad(
			{
				seed: cascadeSeed('l1'),
				event: cascadeEvent,
				location: { id: 'l1', name: 'Bedside', version: 1 }
			},
			'/api/locations/l1'
		);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const load = garden.load();
		await vi.waitFor(() => expect(fixture.fetch.mock.calls.length).toBeGreaterThan(0));
		await expect(garden.removeLocation('l1')).resolves.toBe(true);
		fixture.resolveBaseline();
		await load;
		expect(garden.seeds[0].loc).toBe('');
	});
	it('filters a deleted tag from a seed restored by a delayed load', async () => {
		const fixture = installCascadeLoad(
			{
				seed: cascadeSeed(null, ['t1']),
				event: cascadeEvent,
				tag: { id: 't1', name: 'Favorite', version: 1 }
			},
			'/api/tags/t1'
		);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const load = garden.load();
		await vi.waitFor(() => expect(fixture.fetch.mock.calls.length).toBeGreaterThan(0));
		await expect(garden.removeTag('t1')).resolves.toBe(true);
		fixture.resolveBaseline();
		await load;
		expect(garden.seeds[0].tags).toEqual([]);
	});
	it('restores a seed and child event after an unacknowledged delete fails', async () => {
		const fixture = installCascadeLoad(
			{ seed: cascadeSeed(), event: cascadeEvent },
			'/api/seeds/s1',
			true
		);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const load = garden.load();
		await vi.waitFor(() => expect(fixture.fetch.mock.calls.length).toBeGreaterThan(0));
		await expect(garden.removeSeeds(['s1'])).resolves.toEqual([false]);
		expect(garden.seeds.map((seed) => seed.id)).toEqual(['s1']);
		expect(garden.events.map((event) => event.id)).toEqual(['e1']);
		fixture.resolveBaseline();
		await load;
		expect(garden.events.map((event) => event.id)).toEqual(['e1']);
	});
	it('applies ZIP enrichment to live seed values and counts ZIP as an acknowledged write', async () => {
		let releaseCatalog!: (response: Response) => void;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/households/me/location' && init?.method === 'PUT')
				return Promise.resolve(envelope({ zip: '12345', usdaZone: '6a' }));
			if (url.pathname === '/api/catalog/c1')
				return new Promise<Response>((resolve) => (releaseCatalog = resolve));
			if (url.pathname === '/api/recommendations/bulk')
				return Promise.resolve(envelope({ recommendations: [], pending: [] }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Untitled seed',
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
				catalogId: 'c1',
				source: 'store'
			}
		];
		const saving = garden.saveZip('12345');
		await vi.waitFor(() => expect(releaseCatalog).toBeTypeOf('function'));
		garden.seeds = garden.seeds.map((seed) => ({
			...seed,
			name: 'Live baseline name',
			version: 7
		}));
		releaseCatalog(envelope({ catalog_seed: { id: 'c1', common_name: 'Tomato' } }));
		await expect(saving).resolves.toBe(true);
		expect(garden.home.zip).toBe('12345');
		expect(garden.seeds[0]).toMatchObject({ name: 'Live baseline name', version: 7 });
	});
	it('keeps a successful ZIP write when an older household baseline finishes', async () => {
		let releaseMe!: (response: Response) => void;
		let meCalls = 0;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			if (url.pathname === '/api/households/me/location' && init?.method === 'PUT')
				return Promise.resolve(envelope({ zip: '12345', usdaZone: '6a' }));
			if (url.pathname === '/api/households/me' && (init?.method ?? 'GET') === 'GET') {
				meCalls++;
				if (meCalls === 1) return new Promise<Response>((resolve) => (releaseMe = resolve));
				return Promise.resolve(
					envelope({
						household: { id: 'h1', name: 'Garden', location: { zip: '12345', usdaZone: '6a' } }
					})
				);
			}
			return Promise.resolve(envelope({ items: [], cursor: 0, has_more: false }));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		const load = garden.load();
		await vi.waitFor(() => expect(releaseMe).toBeTypeOf('function'));
		await expect(garden.saveZip('12345')).resolves.toBe(true);
		releaseMe(envelope({ household: { id: 'h1', name: 'Garden', location: { zip: '00000' } } }));
		await load;
		expect(meCalls).toBe(1);
		expect(garden.home.zip).toBe('12345');
	});
	it('reconciles an ambiguous photo delete and refreshes the seed version', async () => {
		const calls: { path: string; method: string }[] = [];
		let photoPresent = true;
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ path: url.pathname, method });
			if (url.pathname === '/api/seeds/s1/photos' && method === 'GET')
				return Promise.resolve(
					envelope({ photos: photoPresent ? [{ id: 'p1', seed_id: 's1', role: 'front' }] : [] })
				);
			if (url.pathname === '/api/photos/p1' && method === 'DELETE') {
				photoPresent = false;
				return Promise.reject(new Error('response lost'));
			}
			if (url.pathname === '/api/seeds/s1' && method === 'GET')
				return Promise.resolve(envelope({ seed: { ...seedDto(5), catalog_id: null } }));
			return Promise.resolve(envelope({}));
		});
		vi.stubGlobal('fetch', fetch);
		const garden = new Garden();
		garden.setIdentity('u1', 'h1');
		garden.seeds = [
			{
				id: 's1',
				name: 'Seed',
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
				version: 4,
				catalogId: null,
				source: 'store'
			}
		];
		await garden.seedPhotos('s1');
		await garden.deleteSeedPhoto('p1');
		expect(
			calls.filter((call) => call.path === '/api/seeds/s1/photos' && call.method === 'GET')
		).toHaveLength(2);
		expect(calls.some((call) => call.path === '/api/seeds/s1' && call.method === 'GET')).toBe(true);
	});
});
