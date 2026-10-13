import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Garden } from './garden.svelte';
import { Ui } from './ui.svelte';

const records: Record<string, any[]> = {};
const envelope = (data: unknown) =>
	new Response(JSON.stringify({ ok: true, data }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
const failure = (error: unknown, status: number) =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
function installFetch(): void {
	for (const path of [
		'/api/seeds',
		'/api/beds',
		'/api/planting-events',
		'/api/locations',
		'/api/tags'
	])
		records[path] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (requestInput: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(requestInput));
			const path = url.pathname;
			const collection = Object.keys(records).find((x) => path === x || path.startsWith(`${x}/`));
			if (path === '/api/households/me')
				return envelope({ household: { id: 'h1', name: 'Test', location: null } });
			if (path === '/api/journal')
				return envelope({ items: [], cursor: 0, cursor_id: null, has_more: false });
			if (!collection) return envelope({});
			const method = init?.method ?? 'GET';
			const key = path.split('/').at(-1)!;
			if (method === 'GET')
				return envelope({
					items: records[collection],
					cursor: 0,
					cursor_id: null,
					has_more: false
				});
			if (method === 'DELETE') {
				records[collection] = records[collection].filter((x) => x.id !== key);
				return envelope({ id: key, deleted: true });
			}
			const dto = init?.body ? JSON.parse(String(init.body)) : {};
			const prior = records[collection].find((x) => x.id === key);
			const row = {
				...(prior ?? {}),
				...dto,
				id: dto.id ?? key,
				version: (prior?.version ?? 0) + 1
			};
			if (collection === '/api/seeds')
				Object.assign(row, {
					catalog_id: row.catalog_id ?? null,
					state: row.state ?? 'active',
					packet_count: row.packet_count ?? 1,
					location_id: row.location_id ?? null,
					year_packed: row.year_packed ?? null,
					source: row.source ?? 'store',
					custom_name: row.custom_name ?? 'Untitled seed',
					custom_variety: row.custom_variety ?? '',
					custom_company: row.custom_company ?? '',
					custom_type: row.custom_type ?? '',
					notes: row.notes ?? '',
					tag_ids: row.tag_ids ?? []
				});
			if (collection === '/api/beds')
				Object.assign(row, {
					description: row.description ?? '',
					width_feet: row.width_feet ?? 1,
					length_feet: row.length_feet ?? 1
				});
			if (collection === '/api/planting-events')
				Object.assign(row, {
					bed_id: row.bed_id ?? null,
					seed_id: row.seed_id ?? null,
					planned_for: row.planned_for ?? '2026-10-09',
					completed_at: row.completed_at ?? null,
					x_feet: row.x_feet ?? 0,
					y_feet: row.y_feet ?? 0,
					notes: row.notes ?? ''
				});
			records[collection] = [...records[collection].filter((x) => x.id !== row.id), row];
			const prop = collection.split('/').at(-1)!.replace(/s$/, '');
			const responseKey = prop === 'planting-event' ? 'planting_event' : prop;
			return envelope({ [responseKey]: row });
		})
	);
}

describe('Garden actions', () => {
	beforeEach(installFetch);
	afterEach(() => vi.unstubAllGlobals());
	it('creates seeds asynchronously, normalizes values and serializes edits', async () => {
		const garden = new Garden();
		const seed = await garden.addSeed({ name: ' ', type: '', packets: '-2', year: '20x6' });
		expect(seed).toMatchObject({
			name: 'Untitled seed',
			type: 'Untyped',
			packets: 1,
			year: null,
			version: 1
		});
		await garden.updateSeed(seed.id, { name: 'Renamed' });
		await garden.updateSeed(seed.id, { type: 'Herb' });
		expect(garden.seeds[0]).toMatchObject({ name: 'Renamed', type: 'Herb', version: 3 });
		const sent = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
		expect(sent.custom_type).toBeNull();
		expect((await garden.addSeed({ name: 'Blank packets', packets: null })).packets).toBe(1);
	});
	it('creates planting events and beds with server-compatible event kinds', async () => {
		const garden = new Garden();
		const event = await garden.addEvent({
			bed: 'b1',
			seed: 's1',
			kind: 'sowing',
			date: '2026-10-10',
			x: 1,
			y: 1
		});
		expect(event).toMatchObject({ done: false, notes: '', version: 1 });
		await garden.updateEvent(event.id, { done: true });
		expect(garden.events[0].done).toBe(true);
		expect(await garden.toggleDone(event.id)).toBe(true);
		const bed = await garden.addBed({ name: '', w: 2, l: 3 });
		expect(bed).toMatchObject({ name: 'New bed', desc: '', w: 2, l: 3, version: 1 });
	});
	it('validates and persists locations and tags', async () => {
		const garden = new Garden();
		expect(await garden.addLocation(' ')).toBeNull();
		const location = await garden.addLocation(' Potting shed ');
		expect(location?.name).toBe('Potting shed');
		await garden.addTag(' New tag ');
		expect(garden.tags[0]).toMatchObject({ name: 'New tag', version: 1 });
	});
	it('keeps secret keys masked and export available while CSV import is gated', async () => {
		const garden = new Garden();
		expect(garden.saveKey('   ')).toBe(false);
		expect(garden.saveKey('1234567890')).toBe(true);
		expect(garden.key.masked).toContain('••••');
		expect(JSON.stringify(garden.key)).not.toContain('1234567890');
		garden.setProvider('OpenAI');
		expect(garden.key.provider).toBe('OpenAI');
		garden.removeKey();
		expect(garden.key.saved).toBe(false);
		expect(garden.importCSV('name,status\nNew pea,Wishlist').added).toBe(0);
		expect(garden.exportCSV()).toContain('name,variety');
	});
	it('serializes same-record writes and advances If-Match after each acknowledgement', async () => {
		const garden = new Garden();
		const seed = await garden.addSeed({ name: 'Pea' });
		let calls = 0;
		let resolveFirst!: (response: Response) => void;
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				if (init?.method === 'PATCH') {
					calls++;
					const value = JSON.parse(String(init.body));
					const row = {
						id: seed.id,
						catalog_id: null,
						state: 'active',
						packet_count: 1,
						location_id: null,
						year_packed: null,
						source: 'store',
						custom_name: value.custom_name ?? (calls === 1 ? 'Pea' : 'First'),
						custom_variety: '',
						custom_company: '',
						custom_type: '',
						notes: '',
						tag_ids: [],
						version: calls + 1
					};
					if (calls === 1)
						return new Promise<Response>((resolve) => {
							resolveFirst = resolve;
						});
					return Promise.resolve(envelope({ seed: row }));
				}
				return originalFetch(input, init);
			})
		);
		const first = garden.updateSeed(seed.id, { name: 'First' });
		const second = garden.updateSeed(seed.id, { company: 'Baker' });
		await vi.waitFor(() => expect(calls).toBe(1));
		resolveFirst(
			envelope({
				seed: {
					id: seed.id,
					catalog_id: null,
					state: 'active',
					packet_count: 1,
					location_id: null,
					year_packed: null,
					source: 'store',
					custom_name: 'First',
					custom_variety: '',
					custom_company: '',
					custom_type: '',
					notes: '',
					tag_ids: [],
					version: 2
				}
			})
		);
		await first;
		await second;
		expect(calls).toBe(2);
		expect(
			new Headers((vi.mocked(fetch).mock.calls[1]?.[1] as RequestInit).headers).get('If-Match')
		).toBe('2');
	});
	it('maps conflicts to current server rows and removes rows on update 404', async () => {
		const garden = new Garden();
		garden.setIdentity('u', 'h');
		const row = {
			id: 's',
			name: 'Local',
			variety: '',
			company: '',
			type: 'Untyped',
			state: 'active' as const,
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
			source: 'store' as const
		};
		garden.seeds = [row];
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValueOnce(
				failure(
					{
						code: 'version_conflict',
						message: 'conflict',
						current: {
							id: 's',
							catalog_id: null,
							state: 'active',
							packet_count: 1,
							location_id: null,
							year_packed: null,
							source: 'store',
							custom_name: 'Server',
							custom_variety: '',
							custom_company: '',
							custom_type: '',
							notes: '',
							tag_ids: [],
							version: 4
						}
					},
					409
				)
			)
		);
		await garden.updateSeed('s', { name: 'Attempt' });
		expect(garden.seeds[0]).toMatchObject({ name: 'Server', version: 4 });
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(failure({ code: 'not_found', message: 'missing' }, 404))
		);
		await garden.updateSeed('s', { name: 'Gone' });
		expect(garden.seeds).toEqual([]);
	});
	it('does not apply a baseline started in a previous household generation', async () => {
		const garden = new Garden();
		garden.setIdentity('u', 'h1');
		let release!: (response: Response) => void;
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
					return new Promise<Response>((resolve) => {
						release = resolve;
					});
				return originalFetch(input, init);
			})
		);
		const loading = garden.load();
		await Promise.resolve();
		garden.setIdentity('u', 'h2');
		release(
			envelope({
				items: [
					{
						id: 'old',
						catalog_id: null,
						state: 'active',
						packet_count: 1,
						location_id: null,
						year_packed: null,
						source: 'store',
						custom_name: 'Old',
						custom_variety: '',
						custom_company: '',
						custom_type: '',
						notes: '',
						tag_ids: [],
						version: 1
					}
				],
				cursor: 0,
				cursor_id: null,
				has_more: false
			})
		);
		await loading;
		expect(garden.seeds).toEqual([]);
	});
	it('replays an ambiguous create using the original client id', async () => {
		const originalFetch = globalThis.fetch;
		let firstId = '';
		let secondId = '';
		let attempts = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				if (new URL(String(input)).pathname === '/api/seeds' && init?.method === 'POST') {
					attempts++;
					const dto = JSON.parse(String(init.body));
					if (attempts === 1) {
						firstId = dto.id;
						return Promise.reject(new Error('lost response'));
					}
					secondId = dto.id;
				}
				return originalFetch(input, init);
			})
		);
		const garden = new Garden();
		const seed = await garden.addSeed({ name: 'Replay pea' });
		expect(attempts).toBe(2);
		expect(secondId).toBe(firstId);
		expect(seed.id).toBe(firstId);
	});
	it('reconciles an ambiguous update back to the server baseline', async () => {
		const garden = new Garden();
		const seed = await garden.addSeed({ name: 'Server name' });
		garden.setIdentity('u', 'h');
		const originalFetch = globalThis.fetch;
		let rejected = false;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === `/api/seeds/${seed.id}` && init?.method === 'PATCH' && !rejected) {
					rejected = true;
					return Promise.reject(new Error('network dropped'));
				}
				if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
					return Promise.resolve(
						envelope({
							items: [
								{
									id: seed.id,
									catalog_id: null,
									state: 'active',
									packet_count: 1,
									location_id: null,
									year_packed: null,
									source: 'store',
									custom_name: 'Server name',
									custom_variety: '',
									custom_company: '',
									custom_type: '',
									notes: '',
									tag_ids: [],
									version: 1,
									updated_at: 1
								}
							],
							cursor: 1,
							cursor_id: seed.id,
							has_more: false
						})
					);
				return originalFetch(input, init);
			})
		);
		expect(await garden.updateSeed(seed.id, { name: 'Optimistic' })).toBe(false);
		expect(garden.seeds[0].name).toBe('Server name');
	});
	it('holds a delete tombstone across a concurrent baseline', async () => {
		const garden = new Garden();
		const event = await garden.addEvent({
			bed: 'b1',
			seed: 's1',
			kind: 'sowing',
			date: '2026-10-10',
			x: 1,
			y: 1
		});
		garden.setIdentity('u', 'h');
		const originalFetch = globalThis.fetch;
		let releaseDelete!: (response: Response) => void;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === `/api/planting-events/${event.id}` && init?.method === 'DELETE')
					return new Promise<Response>((resolve) => {
						releaseDelete = resolve;
					});
				return originalFetch(input, init);
			})
		);
		const removing = garden.removeEvent(event.id);
		await vi.waitFor(() => expect(releaseDelete).toBeTypeOf('function'));
		await garden.load();
		expect(garden.events.some((e) => e.id === event.id)).toBe(false);
		releaseDelete(envelope({ id: event.id, deleted: true }));
		await removing;
		expect(garden.events.some((e) => e.id === event.id)).toBe(false);
	});
	it('discards out-of-order baselines and preserves the applied list order', async () => {
		const garden = new Garden();
		garden.setIdentity('u', 'h');
		const row = (id: string, name: string, version: number) => ({
			id,
			catalog_id: null,
			state: 'active',
			packet_count: 1,
			location_id: null,
			year_packed: null,
			source: 'store',
			custom_name: name,
			custom_variety: '',
			custom_company: '',
			custom_type: '',
			notes: '',
			tag_ids: [],
			version
		});
		const pending: ((response: Response) => void)[] = [];
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
					return new Promise<Response>((resolve) => pending.push(resolve));
				return originalFetch(input, init);
			})
		);
		const older = garden.load();
		const newer = garden.load();
		await vi.waitFor(() => expect(pending).toHaveLength(2));
		pending[1](
			envelope({
				items: [row('a', 'A newer', 2), row('b', 'B newer', 2)],
				cursor: 0,
				has_more: false
			})
		);
		await newer;
		pending[0](
			envelope({
				items: [row('b', 'B older', 1), row('a', 'A older', 1)],
				cursor: 0,
				has_more: false
			})
		);
		await older;
		expect(garden.seeds.map((seed) => [seed.id, seed.name, seed.version])).toEqual([
			['a', 'A newer', 2],
			['b', 'B newer', 2]
		]);
	});
	it('keeps an acknowledged update when its load baseline is older', async () => {
		const garden = new Garden();
		garden.setIdentity('u', 'h');
		const row = (name: string, version: number) => ({
			id: 's',
			catalog_id: null,
			state: 'active',
			packet_count: 1,
			location_id: null,
			year_packed: null,
			source: 'store',
			custom_name: name,
			custom_variety: '',
			custom_company: '',
			custom_type: '',
			notes: '',
			tag_ids: [],
			version
		});
		garden.seeds = [
			{
				id: 's',
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
				catalogId: null,
				source: 'store'
			}
		];
		let release!: (response: Response) => void;
		const originalFetch = globalThis.fetch;
		let listCalls = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET' && listCalls++ === 0)
					return new Promise<Response>((resolve) => {
						release = resolve;
					});
				if (url.pathname === '/api/seeds' && (init?.method ?? 'GET') === 'GET')
					return Promise.resolve(
						envelope({ items: [row('Acknowledged', 2)], cursor: 0, has_more: false })
					);
				if (url.pathname === '/api/seeds/s' && init?.method === 'PATCH')
					return Promise.resolve(envelope({ seed: row('Acknowledged', 2) }));
				return originalFetch(input, init);
			})
		);
		const loading = garden.load();
		await vi.waitFor(() => expect(release).toBeTypeOf('function'));
		expect(await garden.updateSeed('s', { name: 'Acknowledged' })).toBe(true);
		release(envelope({ items: [row('Stale baseline', 1)], cursor: 0, has_more: false }));
		await loading;
		await vi.waitFor(() => expect(garden.seeds[0]?.name).toBe('Acknowledged'));
		expect(listCalls).toBe(1);
	});
	it('keeps an acknowledged delete hidden when a load started before it returns', async () => {
		const garden = new Garden();
		const event = await garden.addEvent({
			bed: 'b',
			seed: 's',
			kind: 'sowing',
			date: '2026-10-10',
			x: 0,
			y: 0
		});
		garden.setIdentity('u', 'h');
		let release!: (response: Response) => void;
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (
					url.pathname === '/api/planting-events' &&
					(init?.method ?? 'GET') === 'GET' &&
					!release
				)
					return new Promise<Response>((resolve) => {
						release = resolve;
					});
				return originalFetch(input, init);
			})
		);
		const loading = garden.load();
		await vi.waitFor(() => expect(release).toBeTypeOf('function'));
		expect(await garden.removeEvent(event.id)).toBe(true);
		release(
			envelope({
				items: [
					{
						id: event.id,
						bed_id: 'b',
						seed_id: 's',
						kind: 'sowing',
						planned_for: '2026-10-10',
						completed_at: null,
						x_feet: 0,
						y_feet: 0,
						notes: '',
						version: 1
					}
				],
				cursor: 0,
				has_more: false
			})
		);
		await loading;
		await vi.waitFor(() => expect(garden.events.some((item) => item.id === event.id)).toBe(false));
	});
	it('reconciles failed writes from the server instead of replaying snapshots', async () => {
		const garden = new Garden();
		const seed = await garden.addSeed({ name: 'Server value' });
		garden.setIdentity('u', 'h');
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === `/api/seeds/${seed.id}` && init?.method === 'PATCH')
					return Promise.resolve(failure({ code: 'server_error' }, 500));
				return originalFetch(input, init);
			})
		);
		expect(await garden.updateSeed(seed.id, { name: 'Optimistic' })).toBe(false);
		expect(garden.seeds[0].name).toBe('Server value');
	});
	it('restores cascading entities after failed seed, bed, location, and tag deletes', async () => {
		const garden = new Garden();
		garden.setIdentity('u', 'h');
		const bed = await garden.addBed({ name: 'Bed', w: 2, l: 2 });
		const location = await garden.addLocation('Shed');
		const tag = await garden.addTag('Herb');
		const seed = await garden.addSeed({ name: 'Bean', loc: location!.id, tags: [tag!.id] });
		const event = await garden.addEvent({
			bed: bed.id,
			seed: seed.id,
			kind: 'sowing',
			date: '2026-10-10',
			x: 0,
			y: 0
		});
		const originalFetch = globalThis.fetch;
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
				const path = new URL(String(input)).pathname;
				if (init?.method === 'DELETE')
					return Promise.resolve(failure({ code: 'server_error' }, 500));
				return originalFetch(input, init);
			})
		);
		expect(await garden.removeBed(bed.id)).toBe(false);
		expect(await garden.removeLocation(location!.id)).toBe(false);
		expect(await garden.removeTag(tag!.id)).toBe(false);
		expect((await garden.removeSeeds([seed.id]))[0]).toBe(false);
		expect(garden.beds.some((item) => item.id === bed.id)).toBe(true);
		expect(garden.locations.some((item) => item.id === location!.id)).toBe(true);
		expect(garden.tags.some((item) => item.id === tag!.id)).toBe(true);
		expect(garden.seeds.some((item) => item.id === seed.id && item.loc === location!.id)).toBe(
			true
		);
		expect(garden.events.some((item) => item.id === event.id)).toBe(true);
	});
});

describe('UI overlay and toast state', () => {
	afterEach(() => vi.useRealTimers());
	it('moves opened overlays to the top and closes one layer at a time', () => {
		const ui = new Ui();
		ui.open('palette');
		ui.open('sprout');
		ui.open('palette');
		expect(ui.overlays).toEqual(['sprout', 'palette']);
		expect(ui.modalOpen).toBe(true);
		expect(ui.closeTop()).toBe(true);
		expect(ui.top).toBe('sprout');
		ui.toggle('sprout');
		expect(ui.overlays).toEqual([]);
		expect(ui.modalOpen).toBe(false);
		expect(ui.closeTop()).toBe(false);
	});
	it('replaces and cancels toast timers, with longer action timing', () => {
		vi.useFakeTimers();
		const ui = new Ui();
		ui.showToast('First');
		const firstId = ui.toast!.id;
		vi.advanceTimersByTime(1000);
		ui.showToast('Second', { label: 'Undo', run: () => undefined });
		expect(ui.toast?.id).toBe(firstId + 1);
		vi.advanceTimersByTime(2800);
		expect(ui.toast?.message).toBe('Second');
		vi.advanceTimersByTime(3200);
		expect(ui.toast).toBeNull();
		ui.showToast('Third');
		expect(ui.toast?.id).toBe(firstId + 2);
		ui.dismissToast();
		vi.advanceTimersByTime(3000);
		expect(ui.toast).toBeNull();
	});
	it('opens any defined overlay', () => {
		const ui = new Ui();
		ui.open('shortcuts');
		expect(ui.overlays).toEqual(['shortcuts']);
	});
});
