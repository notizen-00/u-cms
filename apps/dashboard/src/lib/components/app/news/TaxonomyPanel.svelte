<script lang="ts">
	/**
	 * Categories and tags for a post, WordPress-style: a checkbox tree you can
	 * add to without leaving the editor, plus a free-text tag field that creates
	 * missing tags on the fly.
	 *
	 * Selection is submitted as repeated hidden `categoryIds` / `tagIds` inputs,
	 * which the page action reads with `formData.getAll(...)`.
	 *
	 * Creating a term posts to a named form action with `fetch` rather than its
	 * own <form>: this panel renders inside the post's edit form and HTML forms
	 * cannot nest. `deserialize` turns the action's reply back into the same
	 * ActionResult `use:enhance` would have handed us.
	 */
	import { deserialize } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { slugify, sortPagesHierarchically } from '$lib/utils';
	import type { Category, Tag } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	let {
		categories = $bindable([]),
		tags = $bindable([]),
		selectedCategoryIds = $bindable([]),
		selectedTagIds = $bindable([]),
		createCategoryAction = '?/createCategory',
		createTagAction = '?/createTag'
	}: {
		categories?: Category[];
		tags?: Tag[];
		selectedCategoryIds?: string[];
		selectedTagIds?: string[];
		createCategoryAction?: string;
		createTagAction?: string;
	} = $props();

	let categoryFormOpen = $state(false);
	let newCategoryName = $state('');
	let newCategoryParent = $state('');
	let creatingCategory = $state(false);

	let tagInput = $state('');
	let creatingTag = $state(false);
	let error = $state('');

	const categoryTree = $derived(
		sortPagesHierarchically(categories.map((category) => ({ ...category, title: category.name })))
	);
	const selectedTags = $derived(
		selectedTagIds
			.map((id) => tags.find((tag) => tag.id === id))
			.filter((tag): tag is Tag => tag !== undefined)
	);
	const tagSuggestions = $derived.by(() => {
		const query = tagInput.trim().toLowerCase();
		if (!query) return [];
		return tags
			.filter((tag) => tag.name.toLowerCase().includes(query) && !selectedTagIds.includes(tag.id))
			.slice(0, 6);
	});

	function toggleCategory(id: string) {
		selectedCategoryIds = selectedCategoryIds.includes(id)
			? selectedCategoryIds.filter((current) => current !== id)
			: [...selectedCategoryIds, id];
	}

	/** POSTs to a named action without a <form>, and normalises the reply. */
	async function callAction<T>(action: string, fields: Record<string, string>): Promise<T | null> {
		const body = new FormData();
		for (const [key, value] of Object.entries(fields)) body.set(key, value);

		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());

		if (result.type === 'success') return (result.data ?? null) as T | null;
		if (result.type === 'failure') {
			error = String(result.data?.message ?? 'Gagal menyimpan.');
		} else if (result.type === 'error') {
			error = result.error?.message ?? 'Gagal menyimpan.';
		}
		return null;
	}

	async function submitCategory() {
		const name = newCategoryName.trim();
		if (!name || creatingCategory) return;
		error = '';
		creatingCategory = true;
		const data = await callAction<{ category: Category }>(createCategoryAction, {
			name,
			slug: slugify(name),
			parentId: newCategoryParent
		});
		creatingCategory = false;
		if (!data?.category) return;

		categories = [...categories, data.category].sort((a, b) => a.name.localeCompare(b.name));
		selectedCategoryIds = [...selectedCategoryIds, data.category.id];
		newCategoryName = '';
		newCategoryParent = '';
		categoryFormOpen = false;
	}

	async function addTag(name: string) {
		const trimmed = name.trim();
		if (!trimmed || creatingTag) return;
		error = '';

		const existing = tags.find((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
		if (existing) {
			if (!selectedTagIds.includes(existing.id)) selectedTagIds = [...selectedTagIds, existing.id];
			tagInput = '';
			return;
		}

		creatingTag = true;
		const data = await callAction<{ tag: Tag }>(createTagAction, {
			name: trimmed,
			slug: slugify(trimmed)
		});
		creatingTag = false;
		if (!data?.tag) return;

		tags = [...tags, data.tag];
		selectedTagIds = [...selectedTagIds, data.tag.id];
		tagInput = '';
	}

	function onTagKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			void addTag(tagInput);
			return;
		}
		// Backspace on an empty field peels off the last token, as tag fields do.
		if (event.key === 'Backspace' && !tagInput && selectedTagIds.length > 0) {
			selectedTagIds = selectedTagIds.slice(0, -1);
		}
	}
</script>

<!-- Selection travels with the post form; the pickers above are pure UI. -->
{#each selectedCategoryIds as id (id)}
	<input type="hidden" name="categoryIds" value={id} />
{/each}
{#each selectedTagIds as id (id)}
	<input type="hidden" name="tagIds" value={id} />
{/each}

<div class="space-y-5">
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kategori</p>
			<span class="text-[11px] text-muted-foreground">{selectedCategoryIds.length} dipilih</span>
		</div>

		{#if categories.length === 0}
			<p class="text-xs text-muted-foreground">Belum ada kategori di situs ini.</p>
		{:else}
			<div class="max-h-56 space-y-0.5 overflow-y-auto rounded-md border border-border p-2">
				{#each categoryTree as { page: category, depth } (category.id)}
					<label
						class="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
						style="padding-left: {0.375 + depth * 0.9}rem"
					>
						<input
							type="checkbox"
							class="mt-0.5 size-3.5 accent-[var(--primary)]"
							checked={selectedCategoryIds.includes(category.id)}
							onchange={() => toggleCategory(category.id)}
						/>
						<span class="min-w-0 flex-1 break-words">{category.name}</span>
					</label>
				{/each}
			</div>
		{/if}

		{#if categoryFormOpen}
			<div class="space-y-2 rounded-md border border-border p-2">
				<div class="space-y-1">
					<Label for="new-category-name" class="text-xs">Nama kategori</Label>
					<Input
						id="new-category-name"
						bind:value={newCategoryName}
						placeholder="mis. Pengumuman"
						class="h-8 text-sm"
						onkeydown={(event: KeyboardEvent) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void submitCategory();
							}
						}}
					/>
				</div>
				<div class="space-y-1">
					<Label for="new-category-parent" class="text-xs">Induk (opsional)</Label>
					<Select id="new-category-parent" bind:value={newCategoryParent} class="h-8 text-sm">
						<option value="">Tidak ada</option>
						{#each categoryTree as { page: category, depth } (category.id)}
							<option value={category.id}>
								{depth > 0 ? `${'—'.repeat(depth)} ` : ''}{category.name}
							</option>
						{/each}
					</Select>
				</div>
				<div class="flex gap-2">
					<Button
						type="button"
						size="sm"
						disabled={creatingCategory || !newCategoryName.trim()}
						onclick={submitCategory}
					>
						{#if creatingCategory}<LoaderCircle class="animate-spin" />{/if}
						Tambah
					</Button>
					<Button type="button" size="sm" variant="ghost" onclick={() => (categoryFormOpen = false)}>
						Batal
					</Button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
				onclick={() => (categoryFormOpen = true)}
			>
				<Plus class="size-3.5" /> Kategori baru
			</button>
		{/if}
	</section>

	<section class="space-y-2 border-t border-border pt-4">
		<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tag</p>

		{#if selectedTags.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each selectedTags as tag (tag.id)}
					<span class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
						{tag.name}
						<button
							type="button"
							class="text-muted-foreground hover:text-destructive"
							onclick={() => (selectedTagIds = selectedTagIds.filter((id) => id !== tag.id))}
							aria-label="Hapus tag {tag.name}"
						>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<div class="relative">
			<Input
				bind:value={tagInput}
				placeholder="Tulis tag, tekan Enter…"
				class="h-8 text-sm"
				onkeydown={onTagKeydown}
			/>
			{#if creatingTag}
				<LoaderCircle class="absolute right-2 top-2 size-4 animate-spin text-muted-foreground" />
			{/if}
			{#if tagSuggestions.length > 0}
				<div class="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md">
					{#each tagSuggestions as tag (tag.id)}
						<button
							type="button"
							class="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-muted"
							onclick={() => addTag(tag.name)}
						>
							{tag.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<p class="text-xs text-muted-foreground">Tag yang belum ada akan dibuat otomatis.</p>
	</section>

	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
</div>
