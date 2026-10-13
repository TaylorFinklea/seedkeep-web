import { afterEach, describe, expect, it, vi } from 'vitest';
import { Garden } from './garden.svelte';
import { seedRow } from '$lib/domain/derive';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});
describe('catalog recommendation retry', () => {
	it('labels pending results Calculating and retries after five seconds', async () => {
		vi.useFakeTimers();
		let recommendationCalls = 0;
		const seed = {
			id: 'se_web_seed',
			catalog_id: 'cat-1',
			state: 'active',
			packet_count: 1,
			location_id: null,
			year_packed: null,
			source: 'store',
			custom_name: null,
			custom_variety: null,
			custom_company: null,
			custom_type: null,
			notes: '',
			tag_ids: [],
			version: 1,
			updated_at: 1
		};
		const send = (data: unknown) =>
			new Response(JSON.stringify({ ok: true, data }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(String(input));
				if (url.pathname === '/api/seeds')
					return send({ items: [seed], cursor: 1, cursor_id: seed.id, has_more: false });
				if (
					['/api/beds', '/api/planting-events', '/api/locations', '/api/tags'].includes(
						url.pathname
					)
				)
					return send({ items: [], cursor: 0, cursor_id: null, has_more: false });
				if (url.pathname === '/api/households/me')
					return send({
						household: {
							id: 'h',
							name: 'Garden',
							location: {
								zip: '64110',
								latitude: 39.1,
								longitude: -94.5,
								usdaZone: '6b',
								avgFirstFrost: '10-21',
								avgLastFrost: '04-15'
							}
						}
					});
				if (url.pathname === '/api/journal')
					return send({ items: [], cursor: 0, cursor_id: null, has_more: false });
				if (url.pathname === '/api/catalog/cat-1')
					return send({
						catalog_seed: {
							id: 'cat-1',
							common_name: 'Tomato',
							variety: 'Roma',
							company: 'Seed Co',
							scientific_name: 'Solanum lycopersicum',
							frost_tolerance: 'tender',
							sun_requirement: 'full',
							sow_method: 'transplant'
						}
					});
				if (url.pathname === '/api/recommendations/bulk') {
					recommendationCalls++;
					return send(
						recommendationCalls === 1
							? {
									recommendations: [
										{ catalogSeedId: 'cat-1', verdict: null, recommendedRange: null }
									],
									pending: ['cat-1']
								}
							: {
									recommendations: [
										{
											catalogSeedId: 'cat-1',
											verdict: 'plant_now',
											recommendedRange: { start: '2026-10-09', end: '2026-11-10' }
										}
									],
									pending: []
								}
					);
				}
				return send({});
			})
		);
		const garden = new Garden();
		garden.setIdentity('u', 'h');
		await garden.load();
		expect(recommendationCalls).toBe(1);
		expect(seedRow(garden, garden.seeds[0]).verdictLabel).toBe('Calculating…');
		await vi.advanceTimersByTimeAsync(5000);
		await vi.waitFor(() => expect(garden.seeds[0].verdict).toBe('plant_now'));
		expect(recommendationCalls).toBe(2);
		expect(garden.pendingRecommendations.size).toBe(0);
	});
});
