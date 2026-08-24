<script>
	/**
	 * Renders `core.text`. Content is author-written rich text already
	 * sanitized by the Builder Runtime (see ContentRenderer's allowlist); the
	 * theme only supplies its reading column and typography.
	 */
	let { props } = $props();
</script>

<div class="wrap">
	<div class="prose">
		{@html props.content ?? ''}
	</div>
</div>
