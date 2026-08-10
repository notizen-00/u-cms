<script>
	let { news } = $props();
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
</div>
