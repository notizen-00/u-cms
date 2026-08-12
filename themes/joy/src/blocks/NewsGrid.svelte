<script>
	/**
	 * Renders `core.news`. Reads live `news` — the same array the theme's own
	 * home layout uses — rather than anything stored in the block, so the
	 * section keeps showing the latest posts long after the page was authored.
	 * Only `limit`/`title`/`category` come from the block's props.
	 */
	let { props, news = [] } = $props();

	const limit = Number(props.limit) > 0 ? Number(props.limit) : 6;
	const wanted = String(props.category ?? '').trim().toLowerCase();
	const items = $derived(
		news
			.filter(
				(item) =>
					!wanted ||
					(item.categories ?? []).some((category) => category.name.toLowerCase() === wanted)
			)
			.slice(0, limit)
	);
</script>

<div class="wrap">
	<section class="section reveal">
		<div class="section-head">
			<div>
				<span class="eyebrow">Terbaru</span>
				<h2>{props.title || 'Berita Terbaru'}</h2>
			</div>
			<a href="/news/">Lihat semua →</a>
		</div>
		{#if items.length === 0}
			<div class="empty-state">Belum ada berita.</div>
		{:else}
			<div class="card-grid">
				{#each items as item (item.slug)}
					<article class="news-card">
						{#if (item.categories ?? []).length > 0}
							<span class="news-badge">{item.categories.map((category) => category.name).join(', ')}</span>
						{/if}
						<h3><a href={`/news/${item.slug}/`}>{item.title}</a></h3>
						{#if item.excerpt}<p>{item.excerpt}</p>{/if}
						<span class="read-more">Baca selengkapnya →</span>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</div>
