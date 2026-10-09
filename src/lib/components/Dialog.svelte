<!--
	Accessible overlay primitive. CONTRACT (props are parent-owned) — implementation owner: Luna (Phase 1).

	Variants:
	- 'modal'   centred panel over a dimmed backdrop (Add seed, Shortcuts)
	- 'palette' top-anchored panel over a lighter backdrop (⌘K)
	- 'sheet'   full-height panel for narrow-width seed detail
	- 'drawer'  right-side, NON-MODAL panel without a backdrop (Sprout). Deliberate
	            exception: no focus trap and no inert background; focus still moves in
	            on open and returns to the trigger on close; Escape still closes it.

	Required behaviour (Luna):
	- Render nothing when `open` is false.
	- Portal the overlay to document.body so `#app-root` can be made inert.
	- role="dialog"; aria-modal="true" except for 'drawer'; named by `label` or `labelledby`.
	- On open: remember document.activeElement, then focus `initialFocus` (a selector inside the panel) or the first focusable element.
	- Modal variants: trap Tab/Shift+Tab inside the panel; set `inert` on #app-root while open; backdrop click calls onclose.
	- On close: remove inert (only if no other modal remains open) and restore focus to the remembered element if it is still connected.
	- Escape is NOT handled here; the global shortcut handler calls commands.escape(), which closes the topmost overlay.
	- Styles use the design tokens (panel, line, radius 12px, shadow 0 24px 60px rgba(0,0,0,.25); backdrops rgba(10,14,12,.45) modal / .35 palette).
-->
<script module lang="ts">
	type LayerEntry = { node: HTMLElement; modal: boolean };
	const dialogLayers: LayerEntry[] = [];
	function syncLayers(): void {
		const topModal = [...dialogLayers].reverse().find((entry) => entry.modal);
		const hasModal = !!topModal;
		const root = document.getElementById('app-root');
		if (root) root.inert = hasModal;
		for (const entry of dialogLayers) entry.node.inert = hasModal && entry !== topModal;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';

	let {
		open,
		onclose,
		label,
		labelledby,
		variant = 'modal',
		initialFocus,
		width,
		children
	}: {
		open: boolean;
		onclose: () => void;
		label?: string;
		labelledby?: string;
		variant?: 'modal' | 'palette' | 'sheet' | 'drawer';
		initialFocus?: string;
		/** Max panel width, e.g. '640px'. */
		width?: string;
		children: Snippet;
	} = $props();

	let panel = $state<HTMLDivElement>();
	let layer = $state<HTMLDivElement>();
	let priorFocus: HTMLElement | null = null;
	let portal = (node: HTMLElement) => {
		document.body.append(node);
		return { destroy: () => node.remove() };
	};

	$effect(() => {
		if (!open || typeof document === 'undefined') return;
		priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const modal = variant !== 'drawer';
		let entry: LayerEntry | undefined;
		let active = true;
		void tick().then(() => {
			if (!active) return;
			const requested = initialFocus ? panel?.querySelector<HTMLElement>(initialFocus) : null;
			(requested && focusable().includes(requested) ? requested : focusable()[0] ?? panel)?.focus();
		});
		const focusable = (): HTMLElement[] => panel ? Array.from(panel.querySelectorAll<HTMLElement>(
			'a[href], button, input, select, textarea, [tabindex]'
		)).filter((el) => !el.hidden && !(el instanceof HTMLInputElement && el.type === 'hidden') && !(el as HTMLButtonElement).disabled && el.getAttribute('tabindex') !== '-1' && !el.closest('[inert]') && el.getClientRects().length > 0) : [];
		const onKeydown = (event: KeyboardEvent): void => {
			if (!modal || event.key !== 'Tab' || !entry || [...dialogLayers].reverse().find((item) => item.modal) !== entry) return;
			const items = focusable();
			if (!items.length) { event.preventDefault(); panel?.focus(); return; }
			const first = items[0]; const last = items[items.length - 1];
			if (event.shiftKey && (document.activeElement === panel || document.activeElement === first || !panel?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
			else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
		};
		document.addEventListener('keydown', onKeydown);
		void tick().then(() => {
			if (!active || !layer) return;
			entry = { node: layer, modal };
			dialogLayers.push(entry);
			syncLayers();
		});
		return () => {
			active = false;
			document.removeEventListener('keydown', onKeydown);
			if (entry) { const index = dialogLayers.indexOf(entry); if (index >= 0) dialogLayers.splice(index, 1); syncLayers(); }
			if (priorFocus?.isConnected) priorFocus.focus();
		};
	});
</script>

{#if open}
	<div class="layer {variant}" bind:this={layer} use:portal>
		{#if variant !== 'drawer'}
			<div class="backdrop" aria-hidden="true" onclick={(event) => { if (event.target === event.currentTarget) onclose(); }}></div>
		{/if}
		<div class="panel" bind:this={panel} role="dialog" aria-modal={variant === 'drawer' ? undefined : 'true'} aria-label={label} aria-labelledby={labelledby} tabindex="-1" style:--panel-width={width ?? '640px'}>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.layer { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; pointer-events: none; }
	.backdrop { position: absolute; inset: 0; background: rgba(10, 14, 12, .45); pointer-events: auto; }
	.palette .backdrop { background: rgba(10, 14, 12, .35); }
	.panel { position: relative; z-index: 1; pointer-events: auto; background: var(--panel); color: var(--ink); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 24px 60px rgba(0,0,0,.25); width: min(var(--panel-width), calc(100vw - 32px)); max-height: min(90dvh, 900px); overflow: auto; }
	.palette { align-items: flex-start; padding-top: min(15vh, 120px); }
	.palette .panel { width: min(var(--panel-width), calc(100vw - 32px)); max-height: calc(100dvh - min(15vh, 120px) - 16px); }
	.sheet { align-items: stretch; justify-content: flex-end; }
	.sheet .panel { width: min(var(--panel-width), 100vw); max-height: 100dvh; height: 100dvh; border-radius: 12px 0 0 12px; }
	.drawer { justify-content: flex-end; }
	.drawer .panel { width: min(var(--panel-width), 100vw); max-height: 100dvh; height: 100dvh; border-radius: 12px 0 0 12px; }
	@media (max-width: 600px) { .modal .panel, .palette .panel { width: calc(100vw - 16px); max-height: calc(100dvh - min(15vh, 120px) - 16px); } }
</style>
