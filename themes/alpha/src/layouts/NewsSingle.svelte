<script>
	let { item } = $props();

	function formatDate(value) {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}
</script>

<section class="article-hero">
	{#if item.featuredImageUrl}
		<div class="article-hero-media">
			<img src={item.featuredImageUrl} alt={item.title} />
		</div>
	{/if}
	<div class="article-hero-overlay"></div>
	<div class="wrap article-hero-inner">
		{#if item.categories.length > 0}
			<span class="article-hero-eyebrow">{item.categories.map((category) => category.name).join(', ')}</span>
		{/if}
		<h1>{item.title}</h1>
		<div class="meta-row">
			{#if item.publishedAt}<span>{formatDate(item.publishedAt)}</span>{/if}
			{#each item.tags as tag (tag.slug)}
				<span class="pill">#{tag.name}</span>
			{/each}
		</div>
	</div>
</section>

<div class="wrap">
	<div class="prose">
		{@html item.bodyHtml}
	</div>
</div>
