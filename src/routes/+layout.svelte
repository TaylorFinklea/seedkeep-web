<!-- CONTRACT STUB — owner: Haiku (Phase 1). Replace with the Workbench shell.
	Required structure: everything except overlays and the toast lives inside
	<div id="app-root">, so Dialog can set it inert. Call ui.initTheme() and
	bindShortcuts(...) in onMount (return the cleanup). -->
<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div id="app-root">
	<main id="main">{@render children?.()}</main>
</div>
