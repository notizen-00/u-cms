<script>
	let { item } = $props();
</script>

<div class="wrap">
	<div class="article-header"><h1>{item.title}</h1></div>
	<div class="prose">
		{@html item.bodyHtml}
	</div>
</div>
