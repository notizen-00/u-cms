<script>
	/** Renders `alpha.stats-strip` — a row of big numbers under the hero. */
	let { props } = $props();

	const items = Array.isArray(props.items) ? props.items : [];
</script>

{#if items.length > 0}
	<div class="stats-strip">
		<div class="wrap stats-strip__row">
			{#each items as stat, index (index)}
				<div class="stats-strip__item">
					<span class="stats-strip__value">{stat.value}</span>
					<span class="stats-strip__label">{stat.label}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
