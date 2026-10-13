<!-- Email-code sign-in (Workbench styling, no app shell). Step 1 sends a code; step 2 verifies it. -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { ApiError } from '$lib/api';
	import { session } from '$lib/state/session.svelte';

	type Step = 'email' | 'code';

	let step = $state<Step>('email');
	let email = $state('');
	let code = $state('');
	let error = $state('');
	let busy = $state(false);
	let sentTo = $state('');

	/** Resend is blocked until this epoch-ms deadline (from retry_after_seconds). */
	let retryUntil = $state(0);
	let nowMs = $state(Date.now());
	const retryIn = $derived(Math.max(0, Math.ceil((retryUntil - nowMs) / 1000)));

	let timer: ReturnType<typeof setInterval> | undefined;

	$effect(() => {
		if (retryUntil <= Date.now()) return;
		timer = setInterval(() => {
			nowMs = Date.now();
			if (nowMs >= retryUntil && timer) {
				clearInterval(timer);
				timer = undefined;
			}
		}, 500);
		return () => {
			if (timer) clearInterval(timer);
			timer = undefined;
		};
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	/** Normalise any failure into a readable message; returns the server's retry delay when present. */
	function describe(e: unknown, fallback: string): { message: string; retryAfter: number | null } {
		if (e instanceof ApiError) {
			const data = e.data as { retry_after_seconds?: unknown } | null | undefined;
			const raw = data?.retry_after_seconds;
			const retryAfter = typeof raw === 'number' && raw > 0 ? Math.ceil(raw) : null;
			return { message: e.message || fallback, retryAfter };
		}
		return { message: fallback, retryAfter: null };
	}

	function startCountdown(seconds: number): void {
		nowMs = Date.now();
		retryUntil = nowMs + seconds * 1000;
	}

	async function sendCode(sendEvent?: SubmitEvent): Promise<void> {
		sendEvent?.preventDefault();
		const address = email.trim();
		if (!EMAIL_RE.test(address)) {
			error = 'Enter a valid email address.';
			return;
		}
		busy = true;
		error = '';
		try {
			await session.sendCode(address);
			sentTo = address;
			email = address;
			code = '';
			step = 'code';
		} catch (e) {
			const { message, retryAfter } = describe(e, 'Couldn’t send a code. Try again.');
			error = message;
			if (retryAfter) startCountdown(retryAfter);
		} finally {
			busy = false;
		}
	}

	async function verifyCode(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const digits = code.trim();
		if (!/^\d{6}$/.test(digits)) {
			error = 'Enter the 6-digit code from your email.';
			return;
		}
		busy = true;
		error = '';
		try {
			await session.verifyCode(sentTo || email.trim(), digits);
			// The layout guard moves a signed-in user on from /signin.
		} catch (e) {
			const { message, retryAfter } = describe(e, 'That code didn’t work. Check it and try again.');
			error = message;
			if (retryAfter) startCountdown(retryAfter);
		} finally {
			busy = false;
		}
	}

	function useDifferentEmail(): void {
		step = 'email';
		code = '';
		error = '';
	}

	function resend(): void {
		if (retryIn > 0 || busy) return;
		void sendCode();
	}
</script>

<svelte:head>
	<title>Sign in · Seedkeep</title>
</svelte:head>

<div class="auth">
	<section class="panel" aria-labelledby="signin-title">
		<header class="brand">
			<img src="/logo-mark.png" alt="" width="36" height="36" class="logo" />
			<span class="name">Seedkeep</span>
		</header>

		<h1 id="signin-title">Sign in</h1>

		{#if error}
			<p class="alert" role="alert">{error}</p>
		{/if}

		{#if step === 'email'}
			<form class="stack" onsubmit={(e) => sendCode(e)} novalidate>
				<label class="field">
					<span>Email</span>
					<input
						type="email"
						name="email"
						autocomplete="email"
						inputmode="email"
						autocapitalize="none"
						spellcheck="false"
						bind:value={email}
						required
					/>
				</label>
				<button type="submit" class="primary" disabled={busy}
					>{busy ? 'Sending…' : 'Send code'}</button
				>
				<p class="hint">We’ll email you a 6-digit code. No password needed.</p>
			</form>
		{:else}
			<form class="stack" onsubmit={verifyCode} novalidate>
				<p class="hint">Enter the code sent to <strong class="sent">{sentTo}</strong>.</p>
				<label class="field">
					<span>6-digit code</span>
					<input
						type="text"
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="6"
						class="code"
						bind:value={code}
						required
					/>
				</label>
				<button type="submit" class="primary" disabled={busy}
					>{busy ? 'Signing in…' : 'Sign in'}</button
				>
				<div class="row">
					<button type="button" class="link" onclick={useDifferentEmail}
						>Use a different email</button
					>
					<button type="button" class="link" onclick={resend} disabled={retryIn > 0 || busy}>
						{retryIn > 0 ? `Resend code in ${retryIn}s` : 'Resend code'}
					</button>
				</div>
			</form>
		{/if}
	</section>
</div>

<style>
	.auth {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 16px;
		background: var(--bg);
		color: var(--ink);
	}

	.panel {
		width: 100%;
		max-width: 380px;
		padding: 24px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.12);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 18px;
	}

	.logo {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		display: block;
	}

	.name {
		font-weight: 700;
		font-size: 17px;
		letter-spacing: -0.01em;
	}

	h1 {
		margin: 0 0 8px;
		font-size: 20px;
		font-weight: 700;
	}

	.alert {
		margin: 8px 0 12px;
		padding: 8px 10px;
		border-radius: 6px;
		background: var(--warnSoft);
		color: var(--warn);
		font-size: 13px;
	}

	.stack {
		display: grid;
		gap: 12px;
	}

	.field {
		display: grid;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.field input {
		width: 100%;
		min-height: 44px;
		box-sizing: border-box;
		padding: 8px 10px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
		font-size: 15px;
		font-weight: 400;
	}

	.code {
		font-family: var(--mono) !important;
		font-size: 20px !important;
		letter-spacing: 0.3em;
	}

	.primary {
		min-height: 44px;
		border: none;
		border-radius: 6px;
		background: var(--accent);
		color: var(--accentInk);
		font-weight: 600;
		font-size: 15px;
		cursor: pointer;
	}

	.primary:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 13px;
	}

	.sent {
		color: var(--ink);
		overflow-wrap: anywhere;
	}

	.row {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
	}

	.link {
		min-height: 44px;
		padding: 0 4px;
		border: none;
		background: none;
		color: var(--accent);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		text-decoration: underline;
	}

	.link:disabled {
		color: var(--faint);
		cursor: default;
		text-decoration: none;
	}

	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	@media (max-width: 899px), (pointer: coarse) {
		.link {
			min-height: 44px;
		}
	}
</style>
