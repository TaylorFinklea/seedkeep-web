import type {
	Bed,
	Home,
	JournalNote,
	Location,
	PlantingEvent,
	Seed,
	SeedPhoto,
	Tag,
	Verdict,
	YMD
} from '$lib/domain/types';
import { allPages, ApiError, request, setHouseholdHeader } from './client';
import {
	mapBed,
	mapBedInput,
	mapCatalog,
	mapEvent,
	mapEventInput,
	mapHousehold,
	mapJournal,
	mapLocation,
	mapPhoto,
	mapRecommendation,
	mapSeed,
	mapSeedInput,
	mapTag
} from './dto';
export { ApiError, setHouseholdHeader, setUnauthorizedHandler } from './client';
import { setUnauthorizedHandler } from './client';
import { clock } from '$lib/state/clock.svelte';

export interface HouseholdSummary {
	id: string;
	name: string;
	role: 'owner' | 'member';
	joinedAt: number;
}
export interface HouseholdDetail {
	id: string;
	name: string;
	home: Home;
}
export interface CatalogDetail {
	id: string;
	name: string;
	variety: string;
	company: string;
	type: string;
	info: Seed['info'];
}
export interface Recommendation {
	catalogSeedId: string;
	verdict: Verdict | null;
	window: [YMD, YMD] | null;
}
const body = (method: string, data?: unknown, headers?: HeadersInit): RequestInit => ({
	method,
	...(data === undefined ? {} : { body: JSON.stringify(data) }),
	headers
});
const item = (data: any, key: string) => data?.[key] ?? data;

export const auth = {
	sendCode: async (email: string): Promise<void> => {
		await request('/api/auth/email-otp/send-verification-otp', {
			...body('POST', { email, type: 'sign-in' }, { 'Content-Type': 'application/json' }),
			protected: false
		});
	},
	verifyCode: async (email: string, otp: string): Promise<void> => {
		await request('/api/auth/sign-in/email-otp', {
			...body('POST', { email, otp }, { 'Content-Type': 'application/json' }),
			protected: false
		});
	},
	signOut: async (): Promise<void> => {
		await request('/api/auth/sign-out', { ...body('POST'), protected: false });
	},
	me: async (): Promise<{ id: string; email: string; name: string } | null> => {
		try {
			const r = await request<any>('/api/me');
			const u = r.user ?? r;
			return u?.id ? { id: u.id, email: u.email ?? '', name: u.name ?? '' } : null;
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) return null;
			throw e;
		}
	}
};

export const households = {
	list: async (): Promise<HouseholdSummary[]> => {
		const r = await request<any>('/api/households');
		return (r.households ?? []).map((h: any) => ({
			id: h.id,
			name: h.name,
			role: h.role,
			joinedAt: h.joined_at
		}));
	},
	create: async (name: string): Promise<HouseholdSummary> => {
		const r = await request<any>('/api/households', body('POST', { name }));
		const h = r.household ?? r;
		return {
			id: h.id,
			name: h.name,
			role: r.role ?? 'owner',
			joinedAt: h.created_at ?? Date.now()
		};
	},
	me: async (): Promise<HouseholdDetail> =>
		mapHousehold((await request<any>('/api/households/me')).household),
	setLocation: async (zip: string): Promise<Home> =>
		mapHousehold({
			id: '',
			name: '',
			location: await request<any>('/api/households/me/location', body('PUT', { zip }))
		}).home
};

export interface Collection<T extends { id: string; version: number }, Create, Patch> {
	list(): Promise<T[]>;
	get(id: string): Promise<T>;
	create(input: Create & { id: string }): Promise<T>;
	update(id: string, version: number, patch: Patch): Promise<T>;
	remove(id: string, version: number): Promise<void>;
}
function collection<T extends { id: string; version: number }>(
	path: string,
	key: string,
	adapt: (r: any) => T,
	serialize: (v: any) => any
): Collection<T, any, any> {
	return {
		list: async () => (await allPages<any>(path)).filter((row) => !row.deleted_at).map(adapt),
		get: async (id) => adapt(item(await request<any>(`${path}/${encodeURIComponent(id)}`), key)),
		create: async (input) =>
			adapt(
				item(await request<any>(path, body('POST', { id: input.id, ...serialize(input) })), key)
			),
		update: async (id, version, patch) =>
			adapt(
				item(
					await request<any>(
						`${path}/${encodeURIComponent(id)}`,
						body('PATCH', serialize(patch), { 'If-Match': String(version) })
					),
					key
				)
			),
		remove: async (id, version) => {
			await request(`${path}/${encodeURIComponent(id)}`, {
				method: 'DELETE',
				headers: { 'If-Match': String(version) }
			});
		}
	};
}
export const seeds = collection<Seed>('/api/seeds', 'seed', mapSeed, mapSeedInput);
export const locations = collection<Location>(
	'/api/locations',
	'location',
	mapLocation,
	(v: any) => ({ name: v.name })
);
export const tags = collection<Tag>('/api/tags', 'tag', mapTag, (v: any) => ({ name: v.name }));
export const beds = collection<Bed>('/api/beds', 'bed', mapBed, mapBedInput);
export const events = collection<PlantingEvent>(
	'/api/planting-events',
	'planting_event',
	mapEvent,
	mapEventInput
);

export const catalog = {
	get: async (id: string): Promise<CatalogDetail | null> => {
		try {
			return mapCatalog(
				(await request<any>(`/api/catalog/${encodeURIComponent(id)}`)).catalog_seed
			);
		} catch (e) {
			if (e instanceof ApiError && e.status === 404) return null;
			throw e;
		}
	}
};
export const recommendations = {
	bulk: async (ids: string[]): Promise<Recommendation[]> => {
		const all: Recommendation[] = [];
		for (let i = 0; i < ids.length; i += 200) {
			const r = await request<any>(
				'/api/recommendations/bulk',
				body('POST', { catalogSeedIds: ids.slice(i, i + 200) })
			);
			all.push(...(r.recommendations ?? []).map(mapRecommendation));
		}
		return all;
	},
	bulkResult: async (ids: string[]) => {
		const recommendations: Recommendation[] = [];
		const pending: string[] = [];
		for (let i = 0; i < ids.length; i += 200) {
			const r = await request<any>(
				'/api/recommendations/bulk',
				body('POST', { catalogSeedIds: ids.slice(i, i + 200) })
			);
			recommendations.push(...(r.recommendations ?? []).map(mapRecommendation));
			pending.push(...(r.pending ?? []));
		}
		return { recommendations, pending };
	}
};
export const journal = {
	latest: async (): Promise<JournalNote | null> => {
		const rows = await allPages<any>('/api/journal');
		const active = rows.filter(
			(r) => !r.deletedAt && String(r.body ?? '').trim() && r.occurredOn <= clock.today
		);
		active.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id));
		return active[0] ? mapJournal(active[0]) : null;
	}
};
export const photos = {
	list: async (seedId: string): Promise<SeedPhoto[]> =>
		(await request<any>(`/api/seeds/${encodeURIComponent(seedId)}/photos`)).photos.map(mapPhoto),
	upload: async (
		seedId: string,
		file: Blob,
		role: SeedPhoto['role'],
		id: string
	): Promise<SeedPhoto> =>
		mapPhoto(
			(
				await request<any>(
					`/api/seeds/${encodeURIComponent(seedId)}/photos?role=${role}&id=${encodeURIComponent(id)}`,
					{
						method: 'POST',
						body: file,
						headers: { 'Content-Type': file.type || 'application/octet-stream' }
					}
				)
			).photo
		),
	remove: async (photoId: string): Promise<void> => {
		await request(`/api/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
	},
	url: (photoId: string): string => `/api/photos/${encodeURIComponent(photoId)}`
};

export const fetchBlob = (path: string): Promise<Blob> => request<Blob>(path);
