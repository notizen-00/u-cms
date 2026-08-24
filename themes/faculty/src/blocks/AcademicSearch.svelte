<script>
	/**
	 * Renders `faculty.academic-search` and `core.search`.
	 *
	 * A plain GET form, no JavaScript: the published site is static, so the
	 * search has to be a real navigation to whatever `action` points at rather
	 * than a client-side query this build can't answer.
	 */
	let { props } = $props();

	const action = props.action || '/news/';
	const showProgramFilter = props.showProgramFilter === true;
</script>

<div class="wrap">
	<section class="section reveal">
		<form class="academic-search" method="get" {action}>
			<input
				class="academic-search__input"
				type="search"
				name="q"
				placeholder={props.placeholder || 'Cari informasi...'}
				aria-label="Kata kunci pencarian"
			/>
			{#if showProgramFilter}
				<select class="academic-search__select" name="program" aria-label="Program studi">
					<option value="">Semua Program Studi</option>
				</select>
			{/if}
			<button type="submit" class="btn btn-primary">Cari</button>
		</form>
	</section>
</div>

<style>
	.academic-search {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		background: var(--theme-surface);
		border: 1px solid var(--theme-line);
		border-radius: var(--theme-radius-card);
		padding: 20px;
	}
	.academic-search__input,
	.academic-search__select {
		height: 44px;
		border: 1px solid var(--theme-line);
		border-radius: var(--theme-radius-button);
		background: var(--theme-background);
		color: inherit;
	}
	.academic-search__input {
		flex: 1 1 16rem;
		min-width: 0;
		padding: 0 14px;
	}
	.academic-search__select {
		padding: 0 12px;
	}
</style>
