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
<script lang="ts">
	import type { Snippet } from 'svelte';

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

	// Stub: the real implementation uses these.
	const unused = () => [onclose, initialFocus, width];
	void unused;
</script>

{#if open}
	<div role="dialog" aria-modal={variant === 'drawer' ? undefined : 'true'} aria-label={label} aria-labelledby={labelledby}>
		{@render children()}
	</div>
{/if}
