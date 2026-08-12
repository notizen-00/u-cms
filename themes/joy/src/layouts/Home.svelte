<script>
	let { site, theme, news, pages } = $props();

	const latestNews = news.slice(0, 6);
	const infoPages = pages.slice(0, 8);
</script>

<section class="hero">
	{#if theme.heroImage}
		<div class="hero-bg" style={`background-image:url('${theme.heroImage}')`}></div>
	{/if}
	<div class="wrap hero-inner">
		<span class="hero-badge">✨ {theme.heroBadgeText}</span>
		<h1 class="hero-title">{site.name}</h1>
		<p class="hero-tagline">{theme.heroTagline}</p>
		<div class="hero-actions">
			<a class="btn btn-primary" href="#info">Jelajahi Sekarang</a>
			<a class="btn btn-outline" href="/news/">Berita Terbaru</a>
		</div>
	</div>
</section>

<div class="wrap stats-strip">
	<div class="stats-grid reveal">
		<div class="stat-card">
			<div class="stat-value">{theme.stat1Value}</div>
			<div class="stat-label">{theme.stat1Label}</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{theme.stat2Value}</div>
			<div class="stat-label">{theme.stat2Label}</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{theme.stat3Value}</div>
			<div class="stat-label">{theme.stat3Label}</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{theme.stat4Value}</div>
			<div class="stat-label">{theme.stat4Label}</div>
		</div>
	</div>
</div>

<div class="wrap">
	<section class="section reveal">
		<div class="section-head">
			<div>
				<span class="eyebrow">Terbaru</span>
				<h2>Berita &amp; Pengumuman</h2>
			</div>
			<a href="/news/">Lihat semua →</a>
		</div>
		{#if latestNews.length === 0}
			<div class="empty-state">Belum ada berita.</div>
		{:else}
			<div class="card-grid">
				{#each latestNews as item (item.slug)}
					<article class="news-card">
						{#if item.categories.length > 0}
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

	{#if infoPages.length > 0}
		<section id="info" class="section reveal">
			<div class="section-head">
				<div>
					<span class="eyebrow">Informasi</span>
					<h2>Halaman Pilihan</h2>
				</div>
			</div>
			<div class="info-grid">
				{#each infoPages as item (item.slug)}
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
		<h2>Siap Bergabung Bersama Kami?</h2>
		<p>Temukan informasi, program, dan kabar terbaru dari {site.name}.</p>
		<a class="btn btn-primary" href="/news/">Mulai Jelajahi</a>
	</div>
</div>
