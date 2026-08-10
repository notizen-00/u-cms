<script>
	let { item } = $props();

	function formatDate(value) {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}


	const breadcrumbs = [
		{
			label: 'Beranda',
			href: '/'
		},
		{
			label: 'Berita',
			href: '/news/'
		},
		{
			label: item.title
		}
	];
</script>
__BREADCRUMB_SNIPPET__
<div class="wrap">
{@render breadcrumb(breadcrumbs)}
	<div class="article-header">
		<h1>{item.title}</h1>
		<div class="meta-row">
			{#if item.publishedAt}<span>{formatDate(item.publishedAt)}</span>{/if}
			{#each item.categories as category (category.slug)}
				<span class="pill">{category.name}</span>
			{/each}
			{#each item.tags as tag (tag.slug)}
				<span class="pill">#{tag.name}</span>
			{/each}
		</div>
	</div>
	<div class="prose">
		{@html item.bodyHtml}
	</div>
</div>
