<script>
	/**
	 * Renders `core.news` with this theme's richer news card (featured image,
	 * date meta) — the same markup its home layout uses, from live `news`
	 * rather than props, so the section stays current after authoring.
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

	function formatDate(value) {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}
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
						{#if item.featuredImageUrl}
							<div class="news-card-image">
								<img src={item.featuredImageUrl} alt={item.title} loading="lazy" />
								{#if (item.categories ?? []).length > 0}
									<span class="news-badge news-badge-overlay">
										{item.categories.map((category) => category.name).join(', ')}
									</span>
								{/if}
							</div>
						{/if}
						<div class="news-card-body">
							{#if !item.featuredImageUrl && (item.categories ?? []).length > 0}
								<span class="news-badge">{item.categories.map((category) => category.name).join(', ')}</span>
							{/if}
							{#if item.publishedAt}
								<div class="news-card-meta">
									<span>{formatDate(item.publishedAt)}</span>
								</div>
							{/if}
							<h3><a href={`/news/${item.slug}/`}>{item.title}</a></h3>
							{#if item.excerpt}<p>{item.excerpt}</p>{/if}
							<span class="read-more">Baca selengkapnya →</span>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</div>
