<script>
	/** Renders `alpha.mode-grid` — cut-corner cards for game modes/features. */
	let { props } = $props();

	const items = Array.isArray(props.items) ? props.items : [];
</script>

{#if items.length > 0}
	<div class="wrap">
		<section class="section reveal">
			{#if props.title}
				<div class="section-head">
					<div><span class="eyebrow">Pilih</span><h2>{props.title}</h2></div>
				</div>
			{/if}
			<div class="mode-grid">
				{#each items as item, index (index)}
					{#if item.url}
						<a class="mode-card" href={item.url}>
							{#if item.image}<div class="mode-card__image"><img src={item.image} alt="" loading="lazy" /></div>{/if}
							<div class="mode-card__body">
								<h3>{item.title}</h3>
								{#if item.description}<p>{item.description}</p>{/if}
							</div>
						</a>
					{:else}
						<div class="mode-card">
							{#if item.image}<div class="mode-card__image"><img src={item.image} alt="" loading="lazy" /></div>{/if}
							<div class="mode-card__body">
								<h3>{item.title}</h3>
								{#if item.description}<p>{item.description}</p>{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</section>
	</div>
{/if}
