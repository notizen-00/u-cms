<script>
	let { item } = $props();

	const breadcrumbs = [
		{
			label: 'Beranda',
			href: '/'
		},
		{
			label: item.title
		}
	];
</script>

__BREADCRUMB_SNIPPET__

<div class="wrap">
	{@render breadcrumb(breadcrumbs)}
	
	<div class="prose">
		{@html item.bodyHtml}
	</div>
</div>
