import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setHouseholdHeader, setUnauthorizedHandler } from './client';
import {
	mapBed,
	mapCatalog,
	mapEvent,
	mapHousehold,
	mapJournal,
	mapLocation,
	mapPhoto,
	mapRecommendation,
	mapSeed,
	mapSeedInput,
	mapTag
} from './dto';
import { catalog } from './index';

afterEach(() => {
	vi.unstubAllGlobals();
	setHouseholdHeader(null);
	setUnauthorizedHandler(null);
	vi.useRealTimers();
});
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('API client', () => {
	it('sends cookies and household scope and unwraps server envelopes', async () => {
		setHouseholdHeader('house-1');
		const fetch = vi.fn().mockResolvedValue(json({ ok: true, data: { value: 42 } }));
		vi.stubGlobal('fetch', fetch);
		expect(await request<{ value: number }>('/api/seeds')).toEqual({ value: 42 });
		expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
		expect(new Headers(fetch.mock.calls[0][1].headers).get('X-Household-Id')).toBe('house-1');
	});
	it('normalizes envelope errors, better-auth errors and retry countdowns', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(
					json(
						{
							ok: false,
							error: { code: 'rate_limited', message: 'Wait', retry_after_seconds: 17 }
						},
						429
					)
				)
				.mockResolvedValueOnce(json({ message: 'Bad code' }, 401))
		);
		await expect(
			request('/api/auth/email-otp/send-verification-otp', { protected: false })
		).rejects.toMatchObject({
			status: 429,
			code: 'rate_limited',
			message: 'Wait',
			data: { retry_after_seconds: 17 }
		} satisfies Partial<ApiError>);
		await expect(
			request('/api/auth/sign-in/email-otp', { protected: false })
		).rejects.toMatchObject({ status: 401, message: 'Bad code' });
	});
	it('routes protected 401s through the shared sign-out handler', async () => {
		const handler = vi.fn();
		setUnauthorizedHandler(handler);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(json({ ok: false, error: { code: 'unauthorized' } }, 401))
		);
		await expect(request('/api/seeds')).rejects.toBeInstanceOf(ApiError);
		expect(handler).toHaveBeenCalledOnce();
	});
	it('turns aborts into timeout errors', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url, init: RequestInit) =>
					new Promise((_resolve, reject) =>
						init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
					)
			)
		);
		const pending = request('/api/seeds', { timeoutMs: 10 });
		const assertion = expect(pending).rejects.toMatchObject({ status: 0, code: 'timeout' });
		await vi.advanceTimersByTimeAsync(10);
		await assertion;
	});
	it('normalizes body read failures after headers as transport errors', async () => {
		const response = new Response('not json', {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
		await expect(request('/api/seeds')).rejects.toMatchObject({ status: 0, code: 'network_error' });
		const blobResponse = new Response(null, { status: 200 });
		Object.defineProperty(blobResponse, 'blob', {
			value: vi.fn().mockRejectedValue(new Error('read'))
		});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(blobResponse));
		await expect(request('/api/photos/p')).rejects.toMatchObject({
			status: 0,
			code: 'network_error'
		});
		const abort = new AbortController();
		const abortedResponse = new Response('{}', {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
		Object.defineProperty(abortedResponse, 'json', {
			value: vi.fn(() => {
				abort.abort();
				return Promise.reject(new DOMException('Aborted', 'AbortError'));
			})
		});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(abortedResponse));
		await expect(request('/api/seeds', { signal: abort.signal })).rejects.toMatchObject({
			status: 0,
			code: 'timeout'
		});
		const nonJsonAbort = new AbortController();
		const errorResponse = new Response('server error', {
			status: 500,
			headers: { 'content-type': 'text/plain' }
		});
		Object.defineProperty(errorResponse, 'json', {
			value: vi.fn(() => {
				nonJsonAbort.abort();
				return Promise.reject(new DOMException('Aborted', 'AbortError'));
			})
		});
		Object.defineProperty(errorResponse, 'clone', { value: () => errorResponse });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse));
		await expect(request('/api/seeds', { signal: nonJsonAbort.signal })).rejects.toMatchObject({
			status: 0,
			code: 'timeout'
		});
		const streamFailure = new Response('server error', {
			status: 500,
			headers: { 'content-type': 'text/plain' }
		});
		Object.defineProperty(streamFailure, 'json', {
			value: vi.fn().mockRejectedValue(new TypeError('Failed to read response stream'))
		});
		Object.defineProperty(streamFailure, 'clone', { value: () => streamFailure });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamFailure));
		await expect(request('/api/seeds')).rejects.toMatchObject({
			status: 0,
			code: 'network_error'
		});
	});
	it('uses readable fallback copy for known server error codes', async () => {
		const cases = [
			['invalid_email', 'valid email'],
			['otp_busy', 'already being sent'],
			['otp_unavailable', 'temporarily unavailable'],
			['mail_send_failed', 'could not send'],
			['unsupported_media_type', 'not supported'],
			['mail_not_configured', 'not configured'],
			['csrf_origin_rejected', 'untrusted origin'],
			['household_forbidden', 'access to this garden'],
			['version_conflict', 'changed elsewhere']
		] as const;
		for (const [code, copy] of cases) {
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: false, error: { code } }, 400)));
			await expect(request('/api/auth/error', { protected: false })).rejects.toMatchObject({
				code,
				message: expect.stringContaining(copy)
			});
		}
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					json({ ok: false, error: { code: 'rate_limited', retry_after_seconds: 9 } }, 429)
				)
		);
		await expect(request('/api/auth/error', { protected: false })).rejects.toMatchObject({
			message: 'Too many requests. Try again in 9 seconds.'
		});
	});
	it('routes catalog reads through the protected 401 handler', async () => {
		const handler = vi.fn();
		setUnauthorizedHandler(handler);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(json({ ok: false, error: { code: 'unauthorized' } }, 401))
		);
		await expect(catalog.get('c1')).rejects.toMatchObject({ status: 401 });
		expect(handler).toHaveBeenCalledOnce();
	});
});

describe('server DTO adapters', () => {
	it('maps snake-case seed fields and preserves partial PATCH shapes', () => {
		expect(
			mapSeed({
				id: 's',
				custom_name: 'Bean',
				custom_type: null,
				state: 'active',
				packet_count: 2,
				location_id: 'l',
				tag_ids: ['t'],
				version: 4,
				catalog_id: 'c'
			})
		).toMatchObject({
			name: 'Bean',
			type: 'Untyped',
			packets: 2,
			loc: 'l',
			tags: ['t'],
			version: 4,
			catalogId: 'c'
		});
		expect(mapSeedInput({ type: 'Herb' })).toEqual({ custom_type: 'Herb' });
		expect(mapSeedInput({ type: 'Untyped' })).toEqual({ custom_type: null });
	});
	it('maps locations, tags, beds, events, journal and recommendations', () => {
		expect(mapLocation({ id: 'l', name: 'Shed', version: 2 })).toEqual({
			id: 'l',
			name: 'Shed',
			version: 2
		});
		expect(mapTag({ id: 't', name: 'Herb', version: 3 })).toEqual({
			id: 't',
			name: 'Herb',
			version: 3
		});
		expect(
			mapBed({
				id: 'b',
				name: 'Bed',
				description: 'South',
				width_feet: 2,
				length_feet: 5,
				version: 1
			})
		).toMatchObject({ desc: 'South', w: 2, l: 5 });
		expect(
			mapEvent({
				id: 'e',
				bed_id: 'b',
				seed_id: 's',
				kind: 'sowing',
				planned_for: '2026-10-09',
				completed_at: 123,
				x_feet: 1.5,
				y_feet: 2,
				version: 5
			})
		).toMatchObject({ done: true, date: '2026-10-09', x: 1.5, y: 2, version: 5 });
		expect(mapJournal({ occurredOn: '2026-10-09', body: 'Note' })).toEqual({
			date: '2026-10-09',
			body: 'Note'
		});
		expect(
			mapRecommendation({
				catalogSeedId: 'c',
				verdict: 'plant_now',
				recommendedRange: { start: '2026-10-01', end: '2026-10-20' }
			})
		).toEqual({ catalogSeedId: 'c', verdict: 'plant_now', window: ['2026-10-01', '2026-10-20'] });
		expect(
			mapPhoto({ id: 'p', seed_id: 's', role: 'front', width: 10, height: 20, captured_at: 123 })
		).toEqual({ id: 'p', seedId: 's', role: 'front', width: 10, height: 20, capturedAt: 123 });
		expect(
			mapCatalog({
				id: 'c',
				common_name: 'Bean',
				frost_tolerance: 'tender',
				sun_requirement: 'full',
				days_to_maturity_min: 50,
				days_to_maturity_max: 60
			})
		).toMatchObject({ name: 'Bean', info: { frost: 'Tender', sun: 'Full sun', mat: [50, 60] } });
		expect(
			mapHousehold({
				id: 'h',
				name: 'Home',
				location: {
					zip: '64110',
					latitude: 0,
					longitude: 0,
					usdaZone: '6b',
					avgFirstFrost: '10-21',
					avgLastFrost: '04-15'
				}
			}).home
		).toMatchObject({ hasLocation: true, latitude: 0, longitude: 0, zone: '6b' });
	});
});
