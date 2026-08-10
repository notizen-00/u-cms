<script>
	let { news } = $props();

	function formatDate(value) {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}
</script>

<div class="wrap">
	<section class="section">
		<div class="section-head">
			<div>
				<span class="">Arsip</span>
				<h2>Berita &amp; Pengumuman</h2>
			</div>
		</div>
		{#if news.length === 0}
			<div class="empty-state">Belum ada berita.</div>
		{:else}
			<div class="card-grid">
				{#each news as item (item.slug)}
					<article class="news-card">
						{#if item.featuredImageUrl}
							<div class="news-card-image">
								<img src={item.featuredImageUrl} alt={item.title} loading="lazy" />
								{#if item.categories.length > 0}
									<span class="news-badge news-badge-overlay">{item.categories.map((category) => category.name).join(', ')}</span>
								{/if}
							</div>
						{/if}
						<div class="news-card-body">
							{#if !item.featuredImageUrl && item.categories.length > 0}
								<span class="news-badge">{item.categories.map((category) => category.name).join(', ')}</span>
							{/if}
							{#if item.publishedAt}
								<div class="news-card-meta">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
										<rect x="3" y="5" width="18" height="16" rx="2" />
										<path d="M3 10h18M8 3v4M16 3v4" />
									</svg>
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
