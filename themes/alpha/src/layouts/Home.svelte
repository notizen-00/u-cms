<script>
	let { site, theme, news, pages } = $props();

	const latestNews = news.slice(0, 6);
	const stats = Array.isArray(theme.statItems) ? theme.statItems : [];

	function formatDate(value) {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}
</script>

<section class="hero">
	<div class="hero-media">
		{#if theme.heroBackgroundVideo}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video class="hero-video" autoplay muted loop playsinline poster={theme.heroBackgroundImage || undefined}>
				<source src={theme.heroBackgroundVideo} type="video/mp4" />
			</video>
		{:else if theme.heroBackgroundImage}
			<img src={theme.heroBackgroundImage} alt="" />
		{/if}
		<div class="hero-overlay"></div>
	</div>
	<div class="wrap hero-inner">
		{#if theme.heroEyebrow}<span class="hero-eyebrow">{theme.heroEyebrow}</span>{/if}
		<h1 class="hero-title">{theme.heroHeadline || site.name}</h1>
		{#if theme.heroDescription}<p class="hero-desc">{theme.heroDescription}</p>{/if}
		{#if theme.heroCtaLabel}
			<a class="btn btn-primary btn-cut" href={theme.heroCtaUrl || '/news/'}>{theme.heroCtaLabel}</a>
		{/if}
	</div>
</section>

{#if stats.length > 0}
	<div class="stats-strip">
		<div class="wrap stats-strip__row">
			{#each stats as stat, index (index)}
				<div class="stats-strip__item">
					<span class="stats-strip__value">{stat.value}</span>
					<span class="stats-strip__label">{stat.label}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="wrap">
	<section class="section reveal">
		<div class="section-head">
			<div>
				<span class="eyebrow">Terbaru</span>
				<h2>Berita &amp; Pembaruan</h2>
			</div>
			<a href="/news/">Lihat semua →</a>
		</div>
		{#if latestNews.length === 0}
			<div class="empty-state">Belum ada berita.</div>
		{:else}
			<div class="card-grid">
				{#each latestNews as item (item.slug)}
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
								<div class="news-card-meta"><span>{formatDate(item.publishedAt)}</span></div>
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

	{#if pages.length > 0}
		<section class="section reveal">
			<div class="section-head">
				<div>
					<span class="eyebrow">Jelajahi</span>
					<h2>Halaman</h2>
				</div>
			</div>
			<div class="info-grid">
				{#each pages.slice(0, 8) as item (item.slug)}
					<a class="info-card" href={`/${item.slug}/`}>
						<span class="info-icon">{item.title.charAt(0).toUpperCase()}</span>
						<h3>{item.title}</h3>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>

<div class="cta-band reveal">
	<div class="wrap">
		<h2>Siap Bertempur?</h2>
		<p>Bergabunglah dengan komunitas {site.name} dan mulai petualanganmu hari ini.</p>
		<a class="btn btn-primary btn-cut" href="/news/">Mulai Sekarang</a>
	</div>
</div>
