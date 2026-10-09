<!-- CONTRACT STUB — owner: Haiku (Phase 2). Detail panel CONTENT for one seed
	(export lines 174–209). The container (aside or sheet) belongs to the page. -->
<script lang="ts">
	let { seedId, onclose }: { seedId: string; onclose: () => void } = $props();
</script>

<div class="stub">
	<p>Seed {seedId}</p>
	<button type="button" onclick={onclose} aria-label="Close seed details">×</button>
</div>
