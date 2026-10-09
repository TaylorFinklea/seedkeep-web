<script lang="ts">
	import '../app.css';
	import '@phosphor-icons/web/regular';
	let { children } = $props();
</script>

<svelte:head>
	<title>Seedkeep · A little time in the garden</title>
	<meta name="description" content="A quiet place to keep your garden growing." />
</svelte:head>

<a class="skip-link" href="#main">Skip to main content</a>
{@render children?.()}
