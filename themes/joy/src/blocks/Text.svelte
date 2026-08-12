<script>
	/**
	 * Renders `core.text`. The content is author-written rich text that has
	 * already been sanitized by the Builder Runtime before reaching here (see
	 * ContentRenderer's allowlist) — the theme's job is only to give it this
	 * theme's reading column and typography.
	 */
	let { props } = $props();
</script>

<div class="wrap">
	<div class="prose">
		{@html props.content ?? ''}
	</div>
</div>
