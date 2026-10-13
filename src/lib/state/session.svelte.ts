import { ApiError, auth, households, setHouseholdHeader, setUnauthorizedHandler } from '$lib/api';
import type { HouseholdSummary } from '$lib/api';
import { garden } from './garden.svelte';
import { resetSessionUI } from './commands';

export type SessionStatus = 'loading' | 'signed-out' | 'no-household' | 'ready' | 'error';
export class Session {
	status = $state<SessionStatus>('loading');
	user = $state<{ id: string; email: string; name: string } | null>(null);
	households = $state<HouseholdSummary[]>([]);
	householdId = $state<string | null>(null);
	error = $state('');
	/** A message that must survive navigation (e.g. onboarding ZIP failure); shown by the app shell until dismissed. */
	notice = $state('');
	#generation = 0;
	#switchSeq = 0;
	#channel: BroadcastChannel | null = null;
	get household(): HouseholdSummary | null {
		return this.households.find((h) => h.id === this.householdId) ?? null;
	}
	constructor() {
		setUnauthorizedHandler(() => this.handleUnauthorized());
		if (typeof window === 'undefined') return;
		try {
			this.#channel = new BroadcastChannel('seedkeep-session');
			this.#channel.onmessage = (event) => void this.#onBroadcast(event.data);
		} catch {}
		window.addEventListener('storage', (event) => {
			if (event.key !== 'seedkeep-session-event' || !event.newValue) return;
			try {
				void this.#onBroadcast(JSON.parse(event.newValue));
			} catch {}
		});
	}
	#isCurrent = (generation: number, userId?: string): boolean =>
		this.#generation === generation && (userId === undefined || this.user?.id === userId);
	#requestSwitch = (): { sequence: number; generation: number } => ({
		sequence: ++this.#switchSeq,
		generation: ++this.#generation
	});
	#isSwitchCurrent = (sequence: number, generation: number, userId: string): boolean =>
		this.#switchSeq === sequence && this.#isCurrent(generation, userId);
	#broadcast = (type: 'signed-out' | 'household-changed', householdId?: string): void => {
		const message = { type, householdId, nonce: `${Date.now()}-${Math.random()}` };
		this.#channel?.postMessage(message);
		try {
			localStorage.setItem('seedkeep-session-event', JSON.stringify(message));
		} catch {}
	};
	#onBroadcast = async (message: any): Promise<void> => {
		if (!message || !['signed-out', 'household-changed'].includes(message.type)) return;
		if (message.type === 'signed-out') {
			if (this.user) this.handleUnauthorized(false);
			return;
		}
		if (!this.user || this.status === 'signed-out' || !message.householdId) return;
		const userId = this.user.id;
		const { sequence, generation } = this.#requestSwitch();
		try {
			const list = await households.list();
			if (!this.#isSwitchCurrent(sequence, generation, userId)) return;
			this.households = list;
			if (!list.some((household) => household.id === message.householdId)) {
				this.status = 'error';
				this.error = 'That garden is no longer available.';
				return;
			}
			await this.#activate(userId, message.householdId, false, generation, sequence);
		} catch (error) {
			if (!this.#isSwitchCurrent(sequence, generation, userId)) return;
			this.status = 'error';
			this.error = error instanceof Error ? error.message : 'Could not switch gardens.';
		}
	};
	handleUnauthorized = (broadcast = true): void => {
		this.#generation++;
		const userId = this.user?.id;
		garden.setIdentity(null, null);
		if (userId)
			try {
				localStorage.removeItem(`seedkeep.household.${userId}`);
			} catch {}
		this.user = null;
		this.households = [];
		this.householdId = null;
		this.status = 'signed-out';
		this.error = '';
		setHouseholdHeader(null);
		resetSessionUI();
		if (broadcast) this.#broadcast('signed-out');
	};
	init = async (): Promise<void> => {
		const generation = ++this.#generation;
		this.status = 'loading';
		this.error = '';
		try {
			const user = await auth.me();
			if (!this.#isCurrent(generation)) return;
			if (!user) {
				this.user = null;
				this.households = [];
				this.householdId = null;
				garden.setIdentity(null, null);
				this.status = 'signed-out';
				resetSessionUI();
				return;
			}
			this.user = user;
			const list = await households.list();
			if (!this.#isCurrent(generation, user.id)) return;
			this.households = list;
			if (!list.length) {
				this.householdId = null;
				garden.setIdentity(user.id, null);
				this.status = 'no-household';
				return;
			}
			let preferred: string | null = null;
			try {
				preferred = localStorage.getItem(`seedkeep.household.${user.id}`);
			} catch {}
			const choice = list.find((h) => h.id === preferred) ?? list[0];
			await this.#activate(user.id, choice.id, false);
		} catch (e) {
			if (!this.#isCurrent(generation)) return;
			if (e instanceof ApiError && e.status === 401) {
				this.handleUnauthorized(false);
				return;
			}
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Could not load your account.';
		}
	};
	#activate = async (
		userId: string,
		id: string,
		broadcast: boolean,
		generation = this.#generation,
		switchSequence?: number
	): Promise<void> => {
		if (
			!this.#isCurrent(generation, userId) ||
			(switchSequence !== undefined && this.#switchSeq !== switchSequence)
		)
			return;
		this.status = 'loading';
		this.error = '';
		this.householdId = id;
		setHouseholdHeader(id);
		garden.setIdentity(userId, id);
		resetSessionUI();
		try {
			localStorage.setItem(`seedkeep.household.${userId}`, id);
		} catch {}
		if (broadcast) this.#broadcast('household-changed', id);
		await garden.load();
		if (
			!this.#isCurrent(generation, userId) ||
			(switchSequence !== undefined && this.#switchSeq !== switchSequence) ||
			this.householdId !== id
		)
			return;
		if (garden.loadError) {
			this.status = 'error';
			this.error = garden.loadError;
			throw new ApiError(0, 'load_failed', garden.loadError);
		}
		this.status = 'ready';
	};
	sendCode = async (email: string): Promise<void> => {
		this.error = '';
		try {
			await auth.sendCode(email);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Could not send sign-in code.';
			throw e;
		}
	};
	verifyCode = async (email: string, code: string): Promise<void> => {
		this.error = '';
		try {
			await auth.verifyCode(email, code);
			await this.init();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Could not verify sign-in code.';
			throw e;
		}
	};
	createHousehold = async (name: string, zip?: string): Promise<void> => {
		const generation = this.#generation;
		this.notice = '';
		const created = await households.create(name);
		if (!this.#isCurrent(generation)) return;
		if (!this.user) {
			await this.init();
			return;
		}
		const userId = this.user.id;
		this.households = [created, ...this.households.filter((h) => h.id !== created.id)];
		if (zip) {
			setHouseholdHeader(created.id);
			try {
				await households.setLocation(zip);
			} catch (e) {
				if (!this.#isCurrent(generation, userId)) return;
				this.notice = `Garden created, but ZIP ${zip} wasn't found. Set it in Settings.`;
			}
		}
		if (!this.#isCurrent(generation, userId)) return;
		await this.#activate(userId, created.id, true);
	};
	selectHousehold = async (id: string): Promise<void> => {
		if (!this.user || !this.households.some((h) => h.id === id)) return;
		if (id === this.householdId) return;
		const userId = this.user.id;
		const { sequence, generation } = this.#requestSwitch();
		this.status = 'loading';
		try {
			await this.#activate(userId, id, true, generation, sequence);
		} catch (e) {
			if (!this.#isSwitchCurrent(sequence, generation, userId) || this.householdId !== id) return;
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Could not load garden.';
			throw e;
		}
	};
	signOut = async (): Promise<void> => {
		try {
			await auth.signOut();
		} finally {
			this.handleUnauthorized();
		}
	};
}
export const session = new Session();
