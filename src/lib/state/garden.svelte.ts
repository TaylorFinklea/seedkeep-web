import { API_BASE, FEATURES } from '$lib/config';
import {
	ApiError,
	beds as bedApi,
	catalog,
	events as eventApi,
	fetchBlob,
	households,
	journal,
	locations as locationApi,
	photos,
	recommendations,
	seeds as seedApi,
	tags as tagApi,
	setHouseholdHeader
} from '$lib/api';
import { rowsToSeedInputs, toCSV, parseCSV } from '$lib/domain/csv';
import { clock, localYMD } from '$lib/state/clock.svelte';
import { withSolar } from '$lib/domain/solar';
import { mapBed, mapEvent, mapLocation, mapSeed, mapTag } from '$lib/api/dto';
import { ui } from './ui.svelte';
import type {
	AiKey,
	Bed,
	ChatMessage,
	Contribution,
	GardenData,
	Home,
	JournalNote,
	Location,
	PlantingEvent,
	Provider,
	Seed,
	SeedInput,
	SeedPhoto,
	Tag
} from '$lib/domain/types';

const emptyHome = (): Home => ({
	zip: '',
	zone: '',
	place: '',
	firstFrost: '',
	lastFrost: '',
	sunrise: '',
	sunset: '',
	length: '',
	riseMin: 0,
	setMin: 0,
	hasLocation: false,
	daylight: 'unknown',
	latitude: null,
	longitude: null
});
const uuid = (): string =>
	globalThis.crypto?.randomUUID?.() ??
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
type Kind = 'seed' | 'bed' | 'event' | 'location' | 'tag';
type Identity = { userId: string | null; householdId: string | null; generation: number };

export class Garden implements GardenData {
	seeds = $state<Seed[]>([]);
	beds = $state<Bed[]>([]);
	events = $state<PlantingEvent[]>([]);
	locations = $state<Location[]>([]);
	tags = $state<Tag[]>([]);
	contributions = $state<Contribution[]>([]);
	home = $state<Home>(emptyHome());
	note = $state<JournalNote | null>(null);
	key = $state<AiKey>({ provider: 'Anthropic', saved: false, masked: '' });
	thread = $state<ChatMessage[]>([]);
	loading = $state(false);
	loadError = $state('');
	pending = $state<ReadonlySet<string>>(new Set());
	pendingRecommendations = $state<ReadonlySet<string>>(new Set());
	#identity: Identity = { userId: null, householdId: null, generation: 0 };
	#revision = new Map<string, number>();
	#queues = new Map<string, Promise<unknown>>();
	#deleted = new Map<string, number>();
	#failed = new Map<string, number>();
	#versions = new Map<string, number>();
	#loadSequence = 0;
	#enrichmentSequence = 0;
	#appliedLoadSequence = 0;
	#ackEpoch = 0;
	#ackEpochById = new Map<string, number>();
	#catalogEnrichmentSequence = new Map<string, number>();
	#recommendationEnrichmentSequence = new Map<string, number>();
	#pendingRecommendationsSequence = 0;
	#photos = new Map<string, { url: string; used: number }>();
	#photoLoads = new Map<string, Promise<string>>();
	#photoSeeds = new Map<string, string>();
	#photoEpoch = new Map<string, number>();
	#catalog = new Map<string, Awaited<ReturnType<typeof catalog.get>>>();
	#recommendationCache = new Map<string, { verdict: Seed['verdict']; window: Seed['window'] }>();
	#lastRefresh = 0;
	uid = (prefix = 'n'): string => `${prefix}_web_${uuid()}`;
	setIdentity = (userId: string | null, householdId: string | null): void => {
		if (this.#identity.userId === userId && this.#identity.householdId === householdId) return;
		this.#identity = { userId, householdId, generation: this.#identity.generation + 1 };
		this.reset();
		setHouseholdHeader(householdId);
	};
	get identity(): Identity {
		return { ...this.#identity };
	}
	#valid = (s: Identity): boolean =>
		s.generation === this.#identity.generation &&
		s.userId === this.#identity.userId &&
		s.householdId === this.#identity.householdId;
	#rev = (kind: Kind, id: string): string => `${kind}:${id}`;
	#bump = (kind: Kind, id: string): number => {
		const k = this.#rev(kind, id),
			n = (this.#revision.get(k) ?? 0) + 1;
		this.#revision.set(k, n);
		return n;
	};
	#acknowledge = (key: string): number => {
		const epoch = ++this.#ackEpoch;
		this.#ackEpochById.set(key, epoch);
		return epoch;
	};
	#mark = (id: string, on: boolean): void => {
		const next = new Set(this.pending);
		if (on) next.add(id);
		else next.delete(id);
		this.pending = next;
	};
	#queue<T>(key: string, run: () => Promise<T>): Promise<T> {
		const prior = this.#queues.get(key) ?? Promise.resolve();
		const next = prior.catch(() => undefined).then(run);
		this.#queues.set(key, next);
		void next
			.finally(() => {
				if (this.#queues.get(key) === next) this.#queues.delete(key);
			})
			.catch(() => undefined);
		return next;
	}
	#list = (kind: Kind): any[] =>
		kind === 'seed'
			? this.seeds
			: kind === 'bed'
				? this.beds
				: kind === 'event'
					? this.events
					: kind === 'location'
						? this.locations
						: this.tags;
	#setList = (kind: Kind, rows: any[]): void => {
		if (kind === 'seed') this.seeds = rows;
		else if (kind === 'bed') this.beds = rows;
		else if (kind === 'event') this.events = rows;
		else if (kind === 'location') this.locations = rows;
		else this.tags = rows;
	};
	#replaceLocal = (kind: Kind, id: string, row: any): void => {
		const rows = this.#list(kind);
		const index = rows.findIndex((item) => item.id === id);
		if (index < 0) this.#setList(kind, [...rows, row]);
		else
			this.#setList(
				kind,
				rows.map((item, i) => (i === index ? row : item))
			);
	};
	#operationCurrent = (stamp: Identity, kind: Kind, id: string, revision: number): boolean =>
		this.#valid(stamp) && (this.#revision.get(this.#rev(kind, id)) ?? 0) === revision;
	#canApplySeed = (stamp: Identity, id: string, revision: number): boolean => {
		const key = this.#rev('seed', id);
		return (
			this.#operationCurrent(stamp, 'seed', id, revision) &&
			!this.pending.has(id) &&
			!this.#queues.has(key) &&
			!this.#deleted.has(key) &&
			!this.#failed.has(key)
		);
	};
	#removeLocal = (kind: Kind, id: string): void =>
		this.#setList(
			kind,
			this.#list(kind).filter((r) => r.id !== id)
		);
	reset = (): void => {
		this.#identity = { ...this.#identity, generation: this.#identity.generation + 1 };
		this.seeds = [];
		this.beds = [];
		this.events = [];
		this.locations = [];
		this.tags = [];
		this.contributions = [];
		this.note = null;
		this.home = emptyHome();
		this.pending = new Set();
		this.pendingRecommendations = new Set();
		this.#revision.clear();
		this.#deleted.clear();
		this.#failed.clear();
		this.#versions.clear();
		this.#ackEpochById.clear();
		this.#catalogEnrichmentSequence.clear();
		this.#recommendationEnrichmentSequence.clear();
		this.#pendingRecommendationsSequence = 0;
		this.#queues.clear();
		this.#catalog.clear();
		this.#recommendationCache.clear();
		this.#photoLoads.clear();
		this.#photoSeeds.clear();
		this.#revokePhotos();
		this.loading = false;
		this.loadError = '';
		this.#lastRefresh = 0;
	};
	#revokePhotos = (): void => {
		for (const entry of this.#photos.values()) URL.revokeObjectURL(entry.url);
		this.#photos.clear();
	};
	#retryCreate = async <T>(send: () => Promise<T>, stamp: Identity): Promise<T> => {
		try {
			return await send();
		} catch (error) {
			if (
				error instanceof ApiError &&
				(error.status === 0 || error.code === 'timeout' || error.code === 'network_error')
			) {
				await this.load();
				if (!this.#valid(stamp))
					throw new ApiError(0, 'stale_operation', 'Garden changed while saving.');
				return send();
			}
			throw error;
		}
	};
	#create<T extends { id: string; version: number }>(
		kind: Kind,
		id: string,
		send: () => Promise<T>,
		project: (saved: T) => T = (saved) => saved
	): Promise<T> {
		const stamp = this.#identity,
			key = this.#rev(kind, id),
			revision = this.#revision.get(key) ?? this.#bump(kind, id);
		this.#mark(id, true);
		const queued = this.#queue(key, async () => {
			const saved = await this.#retryCreate(send, stamp);
			if (!this.#valid(stamp)) return saved;
			this.#acknowledge(key);
			const version = Math.max(saved.version, this.#versions.get(key) ?? 0);
			this.#versions.set(key, version);
			if (this.#revision.get(key) === revision) {
				let value = { ...project(saved), version };
				if (kind === 'seed')
					value = (await this.#enrich([value as unknown as Seed], stamp))[0] as unknown as T;
				if (this.#operationCurrent(stamp, kind, id, revision)) this.#replaceLocal(kind, id, value);
			}
			return saved;
		});
		return queued.then(
			(saved) => {
				if (!this.#valid(stamp))
					throw new ApiError(0, 'stale_operation', 'Garden changed while saving.');
				if (this.#revision.get(key) === revision) this.#mark(id, false);
				return saved;
			},
			async (error) => {
				if (this.#valid(stamp) && this.#revision.get(key) === revision) {
					this.#removeLocal(kind, id);
					this.#mark(id, false);
				}
				if (this.#valid(stamp)) await this.load();
				throw error;
			}
		);
	}
	#clearCache = (id: string): void => {
		this.#photoEpoch.set(id, (this.#photoEpoch.get(id) ?? 0) + 1);
		const p = this.#photos.get(id);
		if (p) {
			URL.revokeObjectURL(p.url);
			this.#photos.delete(id);
		}
	};
	constructor() {
		clock.subscribe((date) => {
			if (this.home.hasLocation) this.home = withSolar(this.home, date);
		});
		if (typeof window !== 'undefined') {
			window.addEventListener('focus', () => void this.refresh());
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') void this.refresh();
			});
			setInterval(() => {
				if (document.visibilityState === 'visible') {
					this.home = withSolar(this.home, localYMD());
					void this.refresh();
				}
			}, 120_000);
		}
	}
	load = async (): Promise<void> => {
		if (!this.#identity.householdId) return;
		const stamp = this.#identity;
		const sequence = ++this.#loadSequence;
		const loadEpoch = this.#ackEpoch;
		this.loading = true;
		this.loadError = '';
		try {
			const [seeds, beds, events, locations, tags, detail, note] = await Promise.all([
				seedApi.list(),
				bedApi.list(),
				eventApi.list(),
				locationApi.list(),
				tagApi.list(),
				households.me(),
				journal.latest()
			]);
			if (!this.#valid(stamp)) return;
			if (sequence < this.#appliedLoadSequence) return;
			const enrichedSeeds = await this.#enrich(seeds, stamp);
			if (!this.#valid(stamp)) return;
			if (sequence < this.#appliedLoadSequence) return;
			this.#merge('seed', enrichedSeeds, stamp, sequence, loadEpoch);
			this.#merge('bed', beds, stamp, sequence, loadEpoch);
			this.#merge('event', events, stamp, sequence, loadEpoch);
			this.#merge('location', locations, stamp, sequence, loadEpoch);
			this.#merge('tag', tags, stamp, sequence, loadEpoch);
			const sanitizedEvents = this.events.filter(
				(event) =>
					!this.#deleted.has(this.#rev('seed', event.seed)) &&
					!this.#deleted.has(this.#rev('bed', event.bed))
			);
			if (sanitizedEvents.length !== this.events.length) this.events = sanitizedEvents;
			const sanitizedSeeds = this.seeds.map((seed) => {
				const loc = this.#deleted.has(this.#rev('location', seed.loc)) ? '' : seed.loc;
				const tags = seed.tags.filter((tag) => !this.#deleted.has(this.#rev('tag', tag)));
				return loc !== seed.loc || tags.length !== seed.tags.length ? { ...seed, loc, tags } : seed;
			});
			if (sanitizedSeeds.some((seed, index) => seed !== this.seeds[index]))
				this.seeds = sanitizedSeeds;
			const homeKey = this.#rev('location', 'home');
			if ((this.#ackEpochById.get(homeKey) ?? 0) <= loadEpoch) {
				this.home = withSolar(detail.home, localYMD());
				this.#ackEpochById.delete(homeKey);
			}
			this.note = note && note.body.trim() && note.date <= clock.today ? note : null;
			this.#appliedLoadSequence = sequence;
		} catch (error) {
			if (
				this.#valid(stamp) &&
				sequence >= this.#appliedLoadSequence &&
				sequence === this.#loadSequence
			) {
				this.loadError = error instanceof Error ? error.message : 'Could not load garden.';
			}
		} finally {
			if (this.#valid(stamp) && sequence === this.#loadSequence) this.loading = false;
		}
	};
	#merge = (
		kind: Kind,
		rows: any[],
		stamp: Identity,
		sequence: number,
		loadEpoch: number
	): void => {
		if (!this.#valid(stamp)) return;
		const current = this.#list(kind);
		const server = new Map(rows.map((row) => [row.id, row]));
		const serverIds = new Set(server.keys());
		const result: any[] = [];
		const recovered = new Set<string>();
		for (const old of current) {
			const key = this.#rev(kind, old.id);
			const versionFloor = Math.max(old.version, this.#versions.get(key) ?? 0);
			this.#versions.set(key, versionFloor);
			const failedAt = this.#failed.get(key);
			const acknowledgedAfterLoad = (this.#ackEpochById.get(key) ?? 0) > loadEpoch;
			const deleteAcknowledgedAfterLoad =
				this.#deleted.has(key) && (this.#ackEpochById.get(key) ?? 0) > loadEpoch;
			const protectedRow =
				acknowledgedAfterLoad ||
				this.pending.has(old.id) ||
				this.#queues.has(key) ||
				deleteAcknowledgedAfterLoad ||
				(failedAt != null && sequence <= failedAt);
			const incoming = server.get(old.id);
			if (protectedRow || (incoming && incoming.version < versionFloor)) {
				result.push(old);
				server.delete(old.id);
				continue;
			}
			if (incoming) {
				result.push(incoming);
				this.#versions.set(key, Math.max(incoming.version, this.#versions.get(key) ?? 0));
				recovered.add(key);
				server.delete(old.id);
			}
		}
		for (const row of rows) {
			if (!server.has(row.id)) continue;
			const key = this.#rev(kind, row.id);
			const failedAt = this.#failed.get(key);
			if (
				(this.#ackEpochById.get(key) ?? 0) > loadEpoch ||
				(this.#deleted.has(key) && (this.#ackEpochById.get(key) ?? 0) > loadEpoch) ||
				this.pending.has(row.id) ||
				this.#queues.has(key) ||
				(failedAt != null && sequence <= failedAt)
			)
				continue;
			if (row.version < (this.#versions.get(key) ?? 0)) continue;
			result.push(row);
			this.#versions.set(key, Math.max(row.version, this.#versions.get(key) ?? 0));
			recovered.add(key);
		}
		this.#setList(kind, result);
		for (const [key, ackEpoch] of this.#ackEpochById) {
			if (!key.startsWith(`${kind}:`) || ackEpoch > loadEpoch) continue;
			this.#ackEpochById.delete(key);
			const id = key.slice(kind.length + 1);
			if (!this.#queues.has(key) && !this.pending.has(id)) this.#deleted.delete(key);
		}
		for (const [key, failedAt] of this.#failed) {
			if (!key.startsWith(`${kind}:`) || sequence <= failedAt) continue;
			const id = key.slice(kind.length + 1);
			if (recovered.has(key)) this.#failed.delete(key);
			else if (
				!serverIds.has(id) &&
				!result.some((row) => row.id === id) &&
				!this.#queues.has(key) &&
				!this.pending.has(id) &&
				!this.#deleted.has(key)
			)
				this.#failed.delete(key);
		}
	};
	#enrich = async (rows: Seed[], stamp: Identity, attempt = 0): Promise<Seed[]> => {
		const ids = [...new Set(rows.map((s) => s.catalogId).filter((v): v is string => !!v))];
		const revisions = new Map(
			rows.map((seed) => [seed.id, this.#revision.get(this.#rev('seed', seed.id)) ?? 0])
		);
		await Promise.all(
			ids.map(async (id) => {
				if (this.#catalog.has(id)) return;
				try {
					const token = ++this.#enrichmentSequence;
					const detail = await catalog.get(id);
					if (this.#valid(stamp) && token > (this.#catalogEnrichmentSequence.get(id) ?? 0)) {
						this.#catalog.set(id, detail);
						this.#catalogEnrichmentSequence.set(id, token);
					}
				} catch {
					// Enrichment is optional; a later load can retry this lookup.
				}
			})
		);
		if (!this.#valid(stamp)) return rows;
		if (ids.length) {
			try {
				const token = ++this.#enrichmentSequence;
				const result = await recommendations.bulkResult(ids);
				if (!this.#valid(stamp)) return rows;
				if (token > this.#pendingRecommendationsSequence) {
					this.pendingRecommendations = new Set(result.pending);
					this.#pendingRecommendationsSequence = token;
				}
				const recommendationsByCatalog = new Map(
					result.recommendations.map((recommendation) => [
						recommendation.catalogSeedId,
						recommendation
					])
				);
				for (const catalogId of ids) {
					if (token > (this.#recommendationEnrichmentSequence.get(catalogId) ?? 0)) {
						const recommendation = recommendationsByCatalog.get(catalogId);
						if (recommendation) {
							this.#recommendationCache.set(recommendation.catalogSeedId, {
								verdict: recommendation.verdict,
								window: recommendation.window
							});
						}
						this.#recommendationEnrichmentSequence.set(catalogId, token);
					}
				}
				if (result.pending.length && attempt < 3)
					this.#scheduleRecommendationRetry(ids, stamp, attempt + 1, revisions);
			} catch {
				// Keep the last known recommendation while the service is unavailable.
			}
		}
		return rows.map((seed) => {
			return this.#applyCachedEnrichment(seed);
		});
	};
	#applyCachedEnrichment = (seed: Seed): Seed => {
		const detail = seed.catalogId ? this.#catalog.get(seed.catalogId) : null;
		const recommendation = seed.catalogId
			? this.#recommendationCache.get(seed.catalogId)
			: undefined;
		return {
			...seed,
			...(detail
				? {
						name: seed.name === 'Untitled seed' ? detail.name : seed.name,
						variety: seed.variety || detail.variety,
						company: seed.company || detail.company,
						info: seed.info ?? detail.info,
						catalog: true
					}
				: {}),
			...(recommendation ? { verdict: recommendation.verdict, window: recommendation.window } : {})
		};
	};
	#scheduleRecommendationRetry = (
		ids: string[],
		stamp: Identity,
		attempt: number,
		revisions: Map<string, number>
	): void => {
		setTimeout(() => {
			if (!this.#valid(stamp)) return;
			const token = ++this.#enrichmentSequence;
			void recommendations
				.bulkResult(ids)
				.then((result) => {
					if (!this.#valid(stamp)) return;
					if (token > this.#pendingRecommendationsSequence) {
						this.pendingRecommendations = new Set(result.pending);
						this.#pendingRecommendationsSequence = token;
					}
					const recommendationsByCatalog = new Map(
						result.recommendations.map((recommendation) => [
							recommendation.catalogSeedId,
							recommendation
						])
					);
					const applicable: typeof result.recommendations = [];
					for (const catalogId of ids) {
						if (token > (this.#recommendationEnrichmentSequence.get(catalogId) ?? 0)) {
							const recommendation = recommendationsByCatalog.get(catalogId);
							if (recommendation) {
								this.#recommendationCache.set(recommendation.catalogSeedId, {
									verdict: recommendation.verdict,
									window: recommendation.window
								});
								if (
									this.seeds.some((seed) => {
										const revision = revisions.get(seed.id);
										return (
											seed.catalogId === catalogId &&
											revision != null &&
											this.#canApplySeed(stamp, seed.id, revision)
										);
									})
								)
									applicable.push(recommendation);
							}
							this.#recommendationEnrichmentSequence.set(catalogId, token);
						}
					}
					const byCatalog = new Map(
						applicable.map((recommendation) => [recommendation.catalogSeedId, recommendation])
					);
					this.seeds = this.seeds.map((seed) => {
						const key = this.#rev('seed', seed.id);
						const recommendation = seed.catalogId ? byCatalog.get(seed.catalogId) : undefined;
						if (
							!recommendation ||
							!revisions.has(seed.id) ||
							(this.#revision.get(key) ?? 0) !== revisions.get(seed.id) ||
							this.pending.has(seed.id) ||
							this.#queues.has(key) ||
							this.#deleted.has(key) ||
							this.#failed.has(key)
						)
							return seed;
						return { ...seed, verdict: recommendation.verdict, window: recommendation.window };
					});
					if (result.pending.length && attempt < 3)
						this.#scheduleRecommendationRetry(ids, stamp, attempt + 1, revisions);
				})
				.catch(() => undefined);
		}, 5000);
	};
	refresh = async (force = false): Promise<void> => {
		if (!force && Date.now() - this.#lastRefresh < 30_000) return;
		this.#lastRefresh = Date.now();
		await this.load();
	};
	#write<T extends { id: string; version: number }>(
		kind: Kind,
		id: string,
		optimistic: () => void,
		send: (version: number) => Promise<T | void>,
		remove = false
	): Promise<boolean> {
		const stamp = this.#identity;
		const revision = this.#bump(kind, id);
		const initial = this.#list(kind).find((r) => r.id === id);
		if (initial)
			this.#versions.set(
				this.#rev(kind, id),
				Math.max(initial.version, this.#versions.get(this.#rev(kind, id)) ?? 0)
			);
		if (!remove) this.#deleted.delete(this.#rev(kind, id));
		optimistic();
		this.#mark(id, true);
		if (remove) {
			this.#ackEpochById.delete(this.#rev(kind, id));
			this.#deleted.set(this.#rev(kind, id), this.#loadSequence);
		}
		let reconcileAfter = false;
		const queued = this.#queue(this.#rev(kind, id), async () => {
			try {
				const version = Math.max(
					this.#versions.get(this.#rev(kind, id)) ?? 0,
					initial?.version ?? 0
				);
				const saved = await send(version);
				if (!this.#valid(stamp)) return false;
				this.#acknowledge(this.#rev(kind, id));
				if (saved)
					this.#versions.set(
						this.#rev(kind, id),
						Math.max(saved.version, this.#versions.get(this.#rev(kind, id)) ?? 0)
					);
				if (this.#revision.get(this.#rev(kind, id)) !== revision) return false;
				if (!remove) this.#deleted.delete(this.#rev(kind, id));
				this.#failed.delete(this.#rev(kind, id));
				if (remove) this.#deleted.set(this.#rev(kind, id), this.#loadSequence);
				if (remove) this.#removeLocal(kind, id);
				else if (saved) {
					let value = {
						...saved,
						version: Math.max(saved.version, this.#versions.get(this.#rev(kind, id)) ?? 0)
					};
					if (kind === 'seed')
						value = (await this.#enrich([value as unknown as Seed], stamp))[0] as unknown as T;
					if (!this.#operationCurrent(stamp, kind, id, revision)) return false;
					this.#replaceLocal(kind, id, value);
				}
				return true;
			} catch (error) {
				if (!this.#valid(stamp)) return false;
				if (error instanceof ApiError && error.status === 404) {
					if (this.#revision.get(this.#rev(kind, id)) === revision) {
						this.#acknowledge(this.#rev(kind, id));
						this.#failed.delete(this.#rev(kind, id));
						this.#deleted.set(this.#rev(kind, id), this.#loadSequence);
						this.#removeLocal(kind, id);
					}
					return remove;
				}
				if (
					error instanceof ApiError &&
					error.status === 409 &&
					error.code === 'version_conflict'
				) {
					this.#acknowledge(this.#rev(kind, id));
					const data = error.data as any,
						current = data?.current;
					if (this.#operationCurrent(stamp, kind, id, revision) && current) {
						let mapped = (kind === 'seed'
							? mapSeed(current)
							: kind === 'bed'
								? mapBed(current)
								: kind === 'event'
									? mapEvent(current)
									: kind === 'location'
										? mapLocation(current)
										: mapTag(current)) as unknown as T;
						if (kind === 'seed')
							mapped = (await this.#enrich([mapped as unknown as Seed], stamp))[0] as unknown as T;
						if (!this.#operationCurrent(stamp, kind, id, revision)) return false;
						const version = Math.max(mapped.version, this.#versions.get(this.#rev(kind, id)) ?? 0);
						mapped = { ...mapped, version };
						this.#versions.set(this.#rev(kind, id), version);
						this.#deleted.delete(this.#rev(kind, id));
						this.#failed.delete(this.#rev(kind, id));
						this.#replaceLocal(kind, id, mapped);
					} else if (
						this.#revision.get(this.#rev(kind, id)) === revision &&
						Object.prototype.hasOwnProperty.call(data ?? {}, 'current')
					) {
						this.#deleted.set(this.#rev(kind, id), this.#loadSequence);
						this.#removeLocal(kind, id);
					}
					ui.showToast('This changed elsewhere, so it was reloaded.');
					return false;
				}
				ui.showToast(error instanceof Error ? error.message : 'Could not save that change.');
				if (this.#revision.get(this.#rev(kind, id)) === revision) {
					if (remove) this.#deleted.delete(this.#rev(kind, id));
					this.#failed.set(this.#rev(kind, id), this.#loadSequence);
					this.#mark(id, false);
				}
				reconcileAfter = true;
				return false;
			} finally {
				if (this.#valid(stamp) && this.#revision.get(this.#rev(kind, id)) === revision)
					this.#mark(id, false);
			}
		});
		return queued.then(async (result) => {
			if (reconcileAfter && this.#valid(stamp)) await this.load();
			return result;
		});
	}
	addSeed = async (input: SeedInput): Promise<Seed> => {
		const state = input.state ?? 'active',
			packets =
				input.packets != null &&
				String(input.packets).trim() !== '' &&
				Number.isInteger(Number(input.packets)) &&
				Number(input.packets) >= 0
					? Number(input.packets)
					: state === 'wishlist'
						? 0
						: 1,
			year = /^\d{4}$/.test(String(input.year ?? '')) ? Number(input.year) : null;
		const seed: Seed = {
			id: this.uid('se'),
			name: input.name?.trim() || 'Untitled seed',
			variety: input.variety?.trim() || '',
			company: input.company?.trim() || '',
			type: input.type?.trim() || 'Untyped',
			state,
			packets,
			year,
			loc: input.loc ?? '',
			tags: [...(input.tags ?? [])],
			verdict: null,
			window: null,
			info: input.info ?? null,
			notes: input.notes ?? '',
			catalog: false,
			version: 0,
			catalogId: null,
			source: 'store'
		};
		this.#bump('seed', seed.id);
		this.seeds = [seed, ...this.seeds];
		return this.#create(
			'seed',
			seed.id,
			() => seedApi.create({ ...seed, id: seed.id }),
			(saved) => ({
				...saved,
				...(seed.info ? { info: seed.info } : {}),
				...(seed.verdict ? { verdict: seed.verdict, window: seed.window } : {})
			})
		);
	};
	updateSeed = (id: string, patch: Partial<Omit<Seed, 'id'>>): Promise<boolean> =>
		this.#write(
			'seed',
			id,
			() => {
				this.seeds = this.seeds.map((s) => (s.id === id ? { ...s, ...patch } : s));
			},
			(v) => seedApi.update(id, v, patch)
		);
	bulkUpdate = (ids: string[], patch: Partial<Omit<Seed, 'id'>>): void => {
		for (const id of ids) void this.updateSeed(id, patch).catch(() => undefined);
	};
	tagSeeds = (ids: string[], tagId: string): void => {
		for (const id of ids) {
			const s = this.seeds.find((x) => x.id === id);
			if (s && !s.tags.includes(tagId))
				void this.updateSeed(id, { tags: [...s.tags, tagId] }).catch(() => undefined);
		}
	};
	removeSeeds = async (ids: string[]): Promise<boolean[]> => {
		const result = await Promise.all(
			ids.map((id) =>
				this.#write(
					'seed',
					id,
					() => {
						this.#removeLocal('seed', id);
						this.events = this.events.filter((e) => e.seed !== id);
					},
					(v) => seedApi.remove(id, v),
					true
				)
			)
		);
		await this.refresh(true);
		return result;
	};
	addEvent = async (
		input: Omit<PlantingEvent, 'id' | 'done' | 'notes' | 'version'> &
			Partial<Pick<PlantingEvent, 'done' | 'notes'>>
	): Promise<PlantingEvent> => {
		if ((input.kind as string) === 'note')
			throw new ApiError(400, 'bad_request', 'Journal notes cannot be planting events.');
		const e: PlantingEvent = {
			...input,
			id: this.uid('pe'),
			done: input.done ?? false,
			notes: input.notes ?? '',
			version: 0
		};
		this.#bump('event', e.id);
		this.events = [...this.events, e];
		return this.#create('event', e.id, () => eventApi.create({ ...e, id: e.id }));
	};
	updateEvent = (id: string, patch: Partial<Omit<PlantingEvent, 'id'>>): Promise<boolean> =>
		this.#write(
			'event',
			id,
			() => {
				this.events = this.events.map((e) => (e.id === id ? { ...e, ...patch } : e));
			},
			(v) => eventApi.update(id, v, patch)
		);
	removeEvent = (id: string): Promise<boolean> =>
		this.#write(
			'event',
			id,
			() => this.#removeLocal('event', id),
			(v) => eventApi.remove(id, v),
			true
		);
	toggleDone = (id: string): Promise<boolean> => {
		const e = this.events.find((x) => x.id === id);
		return e ? this.updateEvent(id, { done: !e.done }) : Promise.resolve(false);
	};
	addBed = async (input: { name: string; desc?: string; w: number; l: number }): Promise<Bed> => {
		const bed: Bed = {
			id: this.uid('bd'),
			name: input.name.trim() || 'New bed',
			desc: input.desc ?? '',
			w: input.w,
			l: input.l,
			version: 0
		};
		this.#bump('bed', bed.id);
		this.beds = [...this.beds, bed];
		return this.#create('bed', bed.id, () => bedApi.create({ ...bed, id: bed.id }));
	};
	updateBed = (id: string, patch: Partial<Omit<Bed, 'id'>>): Promise<boolean> =>
		this.#write(
			'bed',
			id,
			() => {
				this.beds = this.beds.map((b) => (b.id === id ? { ...b, ...patch } : b));
			},
			(v) => bedApi.update(id, v, patch)
		);
	removeBed = (id: string): Promise<boolean> =>
		this.#write(
			'bed',
			id,
			() => {
				this.#removeLocal('bed', id);
				this.events = this.events.filter((e) => e.bed !== id);
			},
			(v) => bedApi.remove(id, v),
			true
		).then(async (ok) => {
			await this.refresh(true);
			return ok;
		});
	addLocation = async (name: string): Promise<Location | null> => {
		const trimmed = name.trim();
		if (!trimmed || this.locations.some((x) => x.name.toLowerCase() === trimmed.toLowerCase()))
			return null;
		const value: Location = { id: this.uid('lo'), name: trimmed, version: 0 };
		this.#bump('location', value.id);
		this.locations = [...this.locations, value];
		return this.#create('location', value.id, () => locationApi.create({ ...value, id: value.id }));
	};
	updateLocation = (id: string, name: string): Promise<boolean> =>
		this.#write(
			'location',
			id,
			() => {
				this.locations = this.locations.map((x) => (x.id === id ? { ...x, name } : x));
			},
			(v) => locationApi.update(id, v, { name })
		);
	removeLocation = (id: string): Promise<boolean> =>
		this.#write(
			'location',
			id,
			() => {
				this.#removeLocal('location', id);
				this.seeds = this.seeds.map((s) => (s.loc === id ? { ...s, loc: '' } : s));
			},
			(v) => locationApi.remove(id, v),
			true
		).then(async (ok) => {
			await this.refresh(true);
			return ok;
		});
	addTag = async (name: string): Promise<Tag | null> => {
		const trimmed = name.trim();
		if (!trimmed || this.tags.some((x) => x.name.toLowerCase() === trimmed.toLowerCase()))
			return null;
		const value: Tag = { id: this.uid('tg'), name: trimmed, version: 0 };
		this.#bump('tag', value.id);
		this.tags = [...this.tags, value];
		return this.#create('tag', value.id, () => tagApi.create({ ...value, id: value.id }));
	};
	updateTag = (id: string, name: string): Promise<boolean> =>
		this.#write(
			'tag',
			id,
			() => {
				this.tags = this.tags.map((x) => (x.id === id ? { ...x, name } : x));
			},
			(v) => tagApi.update(id, v, { name })
		);
	removeTag = (id: string): Promise<boolean> =>
		this.#write(
			'tag',
			id,
			() => {
				this.#removeLocal('tag', id);
				this.seeds = this.seeds.map((s) => ({ ...s, tags: s.tags.filter((t) => t !== id) }));
			},
			(v) => tagApi.remove(id, v),
			true
		).then(async (ok) => {
			await this.refresh(true);
			return ok;
		});
	saveZip = async (zip: string): Promise<boolean> => {
		if (!/^\d{5}$/.test(zip)) return false;
		const stamp = this.#identity;
		const home = await households.setLocation(zip);
		if (!this.#valid(stamp)) return false;
		this.#acknowledge(this.#rev('location', 'home'));
		this.home = withSolar(home, localYMD());
		const revisions = new Map(
			this.seeds.map((seed) => [seed.id, this.#revision.get(this.#rev('seed', seed.id)) ?? 0])
		);
		const enriched = await this.#enrich(this.seeds, stamp);
		if (!this.#valid(stamp)) return false;
		const enrichedIds = new Set(enriched.map((seed) => seed.id));
		this.seeds = this.seeds.map((seed) => {
			const revision = revisions.get(seed.id);
			return revision != null &&
				enrichedIds.has(seed.id) &&
				this.#canApplySeed(stamp, seed.id, revision)
				? this.#applyCachedEnrichment(seed)
				: seed;
		});
		return true;
	};
	#refreshSeedVersion = async (
		seedId: string,
		stamp: Identity,
		revision = this.#revision.get(this.#rev('seed', seedId)) ?? 0
	): Promise<void> => {
		const key = this.#rev('seed', seedId);
		try {
			const server = await seedApi.get(seedId);
			if (!this.#canApplySeed(stamp, seedId, revision)) return;
			const beforeEnrichment = this.seeds.find((seed) => seed.id === seedId);
			if (!beforeEnrichment || server.version < beforeEnrichment.version) return;
			await this.#enrich([server], stamp);
			if (!this.#canApplySeed(stamp, seedId, revision)) return;
			const live = this.seeds.find((seed) => seed.id === seedId);
			const storedVersion = this.#versions.get(key) ?? 0;
			if (!live || server.version < live.version || server.version < storedVersion) return;
			const version = Math.max(server.version, live.version, storedVersion);
			this.#versions.set(key, version);
			this.#replaceLocal('seed', seedId, this.#applyCachedEnrichment({ ...server, version }));
		} catch {
			// Photo state remains usable if the version refresh endpoint is unavailable.
		}
	};
	seedPhotos = async (seedId: string): Promise<SeedPhoto[]> => {
		const stamp = this.#identity;
		const rows = await photos.list(seedId);
		if (!this.#valid(stamp)) return [];
		for (const row of rows) this.#photoSeeds.set(row.id, seedId);
		return rows;
	};
	photoBlobUrl = async (photoId: string): Promise<string> => {
		const stamp = this.#identity,
			epoch = this.#photoEpoch.get(photoId) ?? 0;
		const cached = this.#photos.get(photoId);
		if (cached) {
			cached.used = Date.now();
			return cached.url;
		}
		let pending = this.#photoLoads.get(photoId);
		if (!pending) {
			pending = (async () => {
				const blob = await fetchBlob(photos.url(photoId));
				if (!this.#valid(stamp) || this.#photoEpoch.get(photoId) !== epoch)
					throw new ApiError(0, 'stale_operation', 'Garden changed while loading photo.');
				const url = URL.createObjectURL(blob);
				this.#photos.set(photoId, { url, used: Date.now() });
				if (this.#photos.size > 30) {
					const [oldestId] = [...this.#photos.entries()].sort((a, b) => a[1].used - b[1].used)[0];
					this.#clearCache(oldestId);
				}
				return url;
			})();
			this.#photoLoads.set(photoId, pending);
		}
		try {
			return await pending;
		} finally {
			if (this.#photoLoads.get(photoId) === pending) this.#photoLoads.delete(photoId);
		}
	};
	uploadSeedPhoto = async (
		seedId: string,
		file: Blob,
		role: SeedPhoto['role']
	): Promise<SeedPhoto> => {
		const stamp = this.#identity;
		const revision = this.#revision.get(this.#rev('seed', seedId)) ?? 0;
		const clientId = this.uid('ph');
		let photo: SeedPhoto;
		try {
			photo = await photos.upload(seedId, file, role, clientId);
		} catch (error) {
			if (
				!(error instanceof ApiError) ||
				!(error.status === 0 || error.code === 'timeout' || error.code === 'network_error')
			)
				throw error;
			let existing: SeedPhoto[] = [];
			try {
				existing = await photos.list(seedId);
			} catch {
				if (!this.#valid(stamp))
					throw new ApiError(0, 'stale_operation', 'Garden changed while uploading photo.');
			}
			if (!this.#valid(stamp))
				throw new ApiError(0, 'stale_operation', 'Garden changed while uploading photo.');
			photo = existing.find((item) => item.id === clientId)!;
			if (!photo) {
				try {
					photo = await photos.upload(seedId, file, role, clientId);
				} catch (retryError) {
					if (
						retryError instanceof ApiError &&
						(retryError.status === 0 ||
							retryError.code === 'timeout' ||
							retryError.code === 'network_error')
					) {
						const afterRetry = await photos.list(seedId).catch(() => []);
						if (!this.#valid(stamp))
							throw new ApiError(0, 'stale_operation', 'Garden changed while uploading photo.');
						photo = afterRetry.find((item) => item.id === clientId)!;
					}
					if (!photo) throw retryError;
				}
			}
		}
		if (!this.#valid(stamp))
			throw new ApiError(0, 'stale_operation', 'Garden changed while uploading photo.');
		this.#photoSeeds.set(photo.id, seedId);
		this.#clearCache(photo.id);
		await this.#refreshSeedVersion(seedId, stamp, revision);
		return photo;
	};
	deleteSeedPhoto = async (photoId: string): Promise<void> => {
		const stamp = this.#identity;
		let seedId = this.#photoSeeds.get(photoId);
		const revisions = new Map(
			this.seeds.map((seed) => [seed.id, this.#revision.get(this.#rev('seed', seed.id)) ?? 0])
		);
		if (!seedId) {
			for (const seed of this.seeds) {
				const rows = await photos.list(seed.id);
				if (!this.#valid(stamp)) return;
				for (const photo of rows) this.#photoSeeds.set(photo.id, seed.id);
				if (rows.some((photo) => photo.id === photoId)) {
					seedId = seed.id;
					break;
				}
			}
		}
		try {
			await photos.remove(photoId);
		} catch (error) {
			if (
				!(error instanceof ApiError) ||
				!(error.status === 0 || error.code === 'timeout' || error.code === 'network_error')
			)
				throw error;
			if (!this.#valid(stamp)) return;
			if (!seedId) throw error;
			const current = await photos.list(seedId);
			if (!this.#valid(stamp)) return;
			for (const photo of current) this.#photoSeeds.set(photo.id, seedId);
			if (current.some((photo) => photo.id === photoId)) {
				try {
					await photos.remove(photoId);
				} catch (retryError) {
					if (!this.#valid(stamp)) return;
					const afterRetry = await photos.list(seedId);
					if (!this.#valid(stamp)) return;
					for (const photo of afterRetry) this.#photoSeeds.set(photo.id, seedId);
					if (afterRetry.some((photo) => photo.id === photoId)) throw retryError;
				}
			}
		}
		if (!this.#valid(stamp)) return;
		this.#photoSeeds.delete(photoId);
		this.#clearCache(photoId);
		if (seedId) await this.#refreshSeedVersion(seedId, stamp, revisions.get(seedId) ?? 0);
	};
	photoUrl = (photoId: string): string => `${API_BASE}${photos.url(photoId)}`;
	saveKey = (raw: string): boolean => {
		const v = raw.trim();
		if (!v) return false;
		this.key = { ...this.key, saved: true, masked: `${v.slice(0, 4)}••••${v.slice(-4)}` };
		return true;
	};
	removeKey = (): void => {
		this.key = { ...this.key, saved: false, masked: '' };
	};
	setProvider = (p: Provider): void => {
		this.key = { ...this.key, provider: p };
	};
	importCSV = (text: string): { added: number; ignored: string[] } => {
		if (!FEATURES.csvImport) return { added: 0, ignored: [] };
		const parsed = rowsToSeedInputs(parseCSV(text));
		for (const input of parsed.inputs) void this.addSeed(input).catch(() => undefined);
		return { added: parsed.inputs.length, ignored: parsed.ignored };
	};
	exportCSV = (): string => toCSV(this);
	addContribution = (_seedId: string, _field: string, _value: string): Contribution | null => null;
}
export const garden = new Garden();
