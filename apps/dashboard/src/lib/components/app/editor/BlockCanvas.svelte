<script lang="ts">
	/**
	 * One block, rendered as the published site renders it — and editable in
	 * place. Every element carries the same `cms-*` class the public HTML uses,
	 * so `lib/styles/content.css` styles the canvas and the preview identically
	 * and "what you see" really is what gets built.
	 *
	 * `block` is a deeply-reactive $state proxy owned by BlockEditor, so writing
	 * to its fields here propagates without $bindable on every property.
	 */
	import { editable } from '$lib/editor/inline';
	import {
		BLOCK_TYPE_LABELS,
		calendarHtml,
		calendarTitle,
		createCardItem,
		createFaqItem,
		createGalleryItem,
		createStatItem,
		toEmbedUrl,
		type Block
	} from '$lib/editor/blocks';
	import { renderMarkdown } from '$lib/editor/render';
	import type { CmsForm } from '$lib/types';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Video from '@lucide/svelte/icons/video';
	import FileCode from '@lucide/svelte/icons/file-code';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';

	let {
		block,
		forms = [],
		onPickImage,
		onOpenSettings,
		onEnter,
		onEmptyBackspace,
		onSlash
	}: {
		block: Block;
		forms?: CmsForm[];
		onPickImage: (blockId: string, target?: string) => void;
		onOpenSettings: (blockId: string) => void;
		onEnter: (blockId: string) => void;
		onEmptyBackspace: (blockId: string) => void;
		onSlash: (blockId: string) => void;
	} = $props();

	const flow = $derived({
		onEnter: () => onEnter(block.id),
		onEmptyBackspace: () => onEmptyBackspace(block.id),
		onSlash: () => onSlash(block.id)
	});

	const sectionClass = $derived(
		`cms-pb-tone-${block.tone} cms-pb-align-${block.align} cms-pb-cols-${block.columnCount}`
	);

	const selectedForm = $derived(forms.find((item) => item.id === block.formId));

	function addListItem(after: number) {
		block.items = [...block.items.slice(0, after + 1), '', ...block.items.slice(after + 1)];
	}

	function removeListItem(index: number) {
		block.items = block.items.length > 1 ? block.items.filter((_, i) => i !== index) : [''];
	}
</script>

<!--
	Every heading below is authored empty and filled by the `editable` action at
	mount, so `a11y_missing_content` can only ever be a false positive here — it
	is silenced per element rather than for the file so a genuinely empty static
	heading would still be caught.
-->

<!--
	Media slots and repeat-item controls are buttons so they stay keyboard
	reachable; the surrounding section is inert chrome that only the editable
	text nodes inside it respond to.
-->
{#snippet mediaSlot(url: string, alt: string, target: string, label: string, className = '')}
	{#if url}
		<button
			type="button"
			class="cms-slot cms-slot--filled {className}"
			onclick={() => onPickImage(block.id, target)}
			title="Ganti gambar"
		>
			<img src={url} {alt} />
			<span class="cms-slot__badge"><ImagePlus class="size-3.5" /> Ganti</span>
		</button>
	{:else}
		<button type="button" class="cms-slot cms-slot--empty {className}" onclick={() => onPickImage(block.id, target)}>
			<ImagePlus class="size-5" />
			<span>{label}</span>
		</button>
	{/if}
{/snippet}

{#snippet repeatRemove(label: string, disabled: boolean, remove: () => void)}
	<button type="button" class="cms-item-remove" {disabled} onclick={remove} title={label} aria-label={label}>
		<Trash2 class="size-3.5" />
	</button>
{/snippet}

{#snippet settingsHint(label: string)}
	<button type="button" class="cms-config" onclick={() => onOpenSettings(block.id)}>
		<Settings2 class="size-3.5" />
		{label}
	</button>
{/snippet}

{#snippet inlineButton(value: string, onInput: (v: string) => void)}
	<span class="cms-button cms-editable" use:editable={{ value, placeholder: 'Label tombol', onInput }}></span>
{/snippet}

{#if block.type === 'heading'}
	<svelte:element
		this={`h${block.level}`}
		class="cms-editable"
		use:editable={{
			value: block.text,
			placeholder: 'Judul bagian…',
			onInput: (v) => (block.text = v),
			...flow
		}}
	></svelte:element>
{:else if block.type === 'paragraph'}
	<p
		class="cms-editable"
		use:editable={{
			value: block.text,
			multiline: true,
			placeholder: 'Tulis sesuatu, atau tekan / untuk memilih blok…',
			onInput: (v) => (block.text = v),
			...flow
		}}
	></p>
{:else if block.type === 'quote'}
	<blockquote>
		<p
			class="cms-editable"
			use:editable={{
				value: block.text,
				multiline: true,
				placeholder: 'Tulis kutipan…',
				onInput: (v) => (block.text = v),
				...flow
			}}
		></p>
	</blockquote>
{:else if block.type === 'code'}
	<pre><code
			class="cms-editable"
			use:editable={{
				value: block.text,
				multiline: true,
				placeholder: 'Tulis kode…',
				onInput: (v) => (block.text = v),
				onEmptyBackspace: flow.onEmptyBackspace
			}}
		></code></pre>
{:else if block.type === 'list'}
	<svelte:element this={block.ordered ? 'ol' : 'ul'}>
		{#each block.items as _, index (index)}
			<li
				class="cms-editable"
				use:editable={{
					value: block.items[index],
					placeholder: 'Item daftar…',
					onInput: (v) => (block.items[index] = v),
					onEnter: () => addListItem(index),
					onEmptyBackspace: () =>
						block.items.length > 1 ? removeListItem(index) : onEmptyBackspace(block.id)
				}}
			></li>
		{/each}
	</svelte:element>
{:else if block.type === 'divider'}
	<hr />
{:else if block.type === 'image'}
	{#if block.url}
		<figure class="cms-canvas-figure">
			{@render mediaSlot(block.url, block.alt, 'block', '', '')}
			<figcaption
				class="cms-editable cms-canvas-caption"
				use:editable={{
					value: block.alt,
					placeholder: 'Teks alternatif (dibaca pembaca layar)…',
					onInput: (v) => (block.alt = v)
				}}
			></figcaption>
		</figure>
	{:else}
		{@render mediaSlot('', '', 'block', 'Pilih gambar dari pustaka media', 'cms-slot--tall')}
	{/if}
{:else if block.type === 'button'}
	<p class="cms-button-row">
		{@render inlineButton(block.label, (v) => (block.label = v))}
		{@render settingsHint(block.url || 'Atur tautan tombol')}
	</p>
{:else if block.type === 'embed'}
	{#if block.url}
		<div class="cms-embed cms-inert">
			<iframe src={toEmbedUrl(block.url)} title="Embed" loading="lazy" tabindex="-1"></iframe>
			<span class="cms-inert__shield"></span>
		</div>
		{@render settingsHint(block.url)}
	{:else}
		<button type="button" class="cms-placeholder" onclick={() => onOpenSettings(block.id)}>
			<Video class="size-6" />
			<span>Tempel tautan YouTube atau Vimeo</span>
		</button>
	{/if}
{:else if block.type === 'calendar'}
	{#if calendarTitle(block.month)}
		<div class="cms-inert">
			{@html calendarHtml(block.month)}
			<span class="cms-inert__shield"></span>
		</div>
		{@render settingsHint(calendarTitle(block.month))}
	{:else}
		{@render settingsHint('Pilih bulan kalender')}
	{/if}
{:else if block.type === 'table'}
	<table>
		<tbody>
			{#each block.rows as row, rowIndex (rowIndex)}
				<tr>
					{#each row as _, colIndex (colIndex)}
						<svelte:element
							this={rowIndex === 0 ? 'th' : 'td'}
							class="cms-editable"
							use:editable={{
								value: block.rows[rowIndex][colIndex],
								placeholder: rowIndex === 0 ? `Kolom ${colIndex + 1}` : '—',
								onInput: (v) => (block.rows[rowIndex][colIndex] = v)
							}}
						></svelte:element>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	<div class="cms-row-actions">
		<button
			type="button"
			onclick={() => (block.rows = [...block.rows, Array(block.rows[0]?.length ?? 2).fill('')])}
		>
			<Plus class="size-3.5" /> Baris
		</button>
		<button type="button" onclick={() => (block.rows = block.rows.map((row) => [...row, '']))}>
			<Plus class="size-3.5" /> Kolom
		</button>
	</div>
{:else if block.type === 'columns'}
	<div class="cms-columns">
		{#each block.columns as _, index (index)}
			<div class="cms-column">
				<div
					class="cms-editable"
					use:editable={{
						value: block.columns[index],
						multiline: true,
						placeholder: `Isi kolom ${index + 1}…`,
						onInput: (v) => (block.columns[index] = v)
					}}
				></div>
			</div>
		{/each}
	</div>
	<div class="cms-row-actions">
		<button type="button" onclick={() => (block.columns = [...block.columns, ''])}>
			<Plus class="size-3.5" /> Kolom
		</button>
		<button
			type="button"
			disabled={block.columns.length <= 1}
			onclick={() => (block.columns = block.columns.slice(0, -1))}
		>
			<Trash2 class="size-3.5" /> Kolom terakhir
		</button>
	</div>
{:else if block.type === 'html'}
	{#if block.text.trim()}
		<div class="cms-inert">
			{@html renderMarkdown(block.text)}
			<span class="cms-inert__shield"></span>
		</div>
		{@render settingsHint('Edit HTML kustom')}
	{:else}
		<button type="button" class="cms-placeholder" onclick={() => onOpenSettings(block.id)}>
			<FileCode class="size-6" />
			<span>Tulis HTML kustom</span>
		</button>
	{/if}
{:else if block.type === 'form'}
	{#if block.formId}
		<div class="cms-form">{selectedForm?.title || block.formTitle || 'Form'}</div>
		{@render settingsHint('Ganti formulir')}
	{:else}
		<button type="button" class="cms-placeholder" onclick={() => onOpenSettings(block.id)}>
			<ClipboardList class="size-6" />
			<span>Pilih formulir</span>
		</button>
	{/if}
{:else if block.type === 'hero'}
	<section class="cms-pb-hero {block.imageUrl ? '' : 'cms-pb-hero--no-media'} {sectionClass}">
		<div class="cms-pb-hero__content">
			<p
				class="cms-pb-hero__eyebrow cms-editable"
				use:editable={{
					value: block.eyebrow,
					placeholder: 'EYEBROW',
					onInput: (v) => (block.eyebrow = v)
				}}
			></p>
			<!-- svelte-ignore a11y_missing_content -->
			<h2
				class="cms-pb-hero__title cms-editable"
				use:editable={{
					value: block.text,
					placeholder: 'Judul utama yang kuat',
					onInput: (v) => (block.text = v)
				}}
			></h2>
			<p
				class="cms-pb-hero__text cms-editable"
				use:editable={{
					value: block.body,
					multiline: true,
					placeholder: 'Jelaskan nilai utama secara singkat…',
					onInput: (v) => (block.body = v)
				}}
			></p>
			{@render inlineButton(block.label, (v) => (block.label = v))}
		</div>
		{#if block.imageUrl}
			<figure class="cms-pb-hero__media">
				{@render mediaSlot(block.imageUrl, block.imageAlt, 'hero', '', 'cms-slot--fill')}
			</figure>
		{:else}
			<!--
				An image-less hero genuinely publishes without a media column, so the
				section keeps its `--no-media` class and this slot simply stacks
				below the copy instead of faking a column that would not exist.
			-->
			<figure class="cms-pb-hero__media">
				{@render mediaSlot('', '', 'hero', 'Gambar hero', '')}
			</figure>
		{/if}
	</section>
{:else if block.type === 'callout'}
	<aside class="cms-pb-callout {sectionClass}">
		<!-- svelte-ignore a11y_missing_content -->
		<h2
			class="cms-pb-callout__title cms-editable"
			use:editable={{ value: block.text, placeholder: 'Ajakan utama', onInput: (v) => (block.text = v) }}
		></h2>
		<p
			class="cms-pb-callout__text cms-editable"
			use:editable={{
				value: block.body,
				multiline: true,
				placeholder: 'Tambahkan penjelasan singkat…',
				onInput: (v) => (block.body = v)
			}}
		></p>
		{@render inlineButton(block.label, (v) => (block.label = v))}
	</aside>
{:else if block.type === 'cards'}
	<section class="cms-pb-card-grid {sectionClass}">
		<!-- svelte-ignore a11y_missing_content -->
		<h2
			class="cms-pb-card-grid__title cms-editable"
			use:editable={{ value: block.text, placeholder: 'Judul bagian', onInput: (v) => (block.text = v) }}
		></h2>
		<p
			class="cms-pb-card-grid__text cms-editable"
			use:editable={{
				value: block.body,
				multiline: true,
				placeholder: 'Deskripsi bagian (opsional)…',
				onInput: (v) => (block.body = v)
			}}
		></p>
		{#each block.cards as card, index (card.id)}
			<article class="cms-pb-card cms-item">
				{@render repeatRemove('Hapus kartu', block.cards.length <= 1, () => {
					block.cards = block.cards.filter((item) => item.id !== card.id);
				})}
				<figure class="cms-pb-card__media">
					{@render mediaSlot(card.imageUrl, card.imageAlt, `card:${card.id}`, 'Gambar', 'cms-slot--fill')}
				</figure>
				<div class="cms-pb-card__body">
					<!-- svelte-ignore a11y_missing_content -->
					<h3
						class="cms-pb-card__title cms-editable"
						use:editable={{
							value: block.cards[index].title,
							placeholder: 'Judul kartu',
							onInput: (v) => (block.cards[index].title = v)
						}}
					></h3>
					<p
						class="cms-pb-card__text cms-editable"
						use:editable={{
							value: block.cards[index].text,
							multiline: true,
							placeholder: 'Deskripsi kartu…',
							onInput: (v) => (block.cards[index].text = v)
						}}
					></p>
					<span
						class="cms-pb-card__link cms-editable"
						use:editable={{
							value: block.cards[index].label,
							placeholder: 'Label tautan',
							onInput: (v) => (block.cards[index].label = v)
						}}
					></span>
				</div>
			</article>
		{/each}
		<button
			type="button"
			class="cms-add-item"
			onclick={() => (block.cards = [...block.cards, createCardItem()])}
		>
			<Plus class="size-4" /> Tambah kartu
		</button>
	</section>
{:else if block.type === 'gallery'}
	<section class="cms-pb-gallery {sectionClass}">
		<!-- svelte-ignore a11y_missing_content -->
		<h2
			class="cms-pb-gallery__title cms-editable"
			use:editable={{ value: block.text, placeholder: 'Judul galeri', onInput: (v) => (block.text = v) }}
		></h2>
		{#each block.gallery as item, index (item.id)}
			<figure class="cms-pb-gallery__item cms-item">
				{@render repeatRemove('Hapus gambar', block.gallery.length <= 1, () => {
					block.gallery = block.gallery.filter((entry) => entry.id !== item.id);
				})}
				{@render mediaSlot(item.url, item.alt, `gallery:${item.id}`, 'Gambar', 'cms-slot--gallery')}
				<figcaption
					class="cms-pb-gallery__caption cms-editable"
					use:editable={{
						value: block.gallery[index].caption,
						placeholder: 'Caption (opsional)',
						onInput: (v) => (block.gallery[index].caption = v)
					}}
				></figcaption>
			</figure>
		{/each}
		<button
			type="button"
			class="cms-add-item"
			onclick={() => (block.gallery = [...block.gallery, createGalleryItem()])}
		>
			<Plus class="size-4" /> Tambah gambar
		</button>
	</section>
{:else if block.type === 'stats'}
	<section class="cms-pb-stats {sectionClass}">
		<!-- svelte-ignore a11y_missing_content -->
		<h2
			class="cms-pb-stats__title cms-editable"
			use:editable={{ value: block.text, placeholder: 'Judul bagian', onInput: (v) => (block.text = v) }}
		></h2>
		<dl class="cms-pb-stats__list">
			{#each block.stats as item, index (item.id)}
				<div class="cms-pb-stat cms-item">
					{@render repeatRemove('Hapus statistik', block.stats.length <= 1, () => {
						block.stats = block.stats.filter((entry) => entry.id !== item.id);
					})}
					<dt
						class="cms-pb-stat__value cms-editable"
						use:editable={{
							value: block.stats[index].value,
							placeholder: '100+',
							onInput: (v) => (block.stats[index].value = v)
						}}
					></dt>
					<dd
						class="cms-pb-stat__label cms-editable"
						use:editable={{
							value: block.stats[index].label,
							placeholder: 'Label',
							onInput: (v) => (block.stats[index].label = v)
						}}
					></dd>
				</div>
			{/each}
		</dl>
		<button
			type="button"
			class="cms-add-item"
			onclick={() => (block.stats = [...block.stats, createStatItem()])}
		>
			<Plus class="size-4" /> Tambah statistik
		</button>
	</section>
{:else if block.type === 'faq'}
	<section class="cms-pb-faq {sectionClass}">
		<!-- svelte-ignore a11y_missing_content -->
		<h2
			class="cms-pb-faq__title cms-editable"
			use:editable={{ value: block.text, placeholder: 'Judul bagian', onInput: (v) => (block.text = v) }}
		></h2>
		{#each block.faqs as item, index (item.id)}
			<div class="cms-pb-faq__item cms-item">
				{@render repeatRemove('Hapus pertanyaan', block.faqs.length <= 1, () => {
					block.faqs = block.faqs.filter((entry) => entry.id !== item.id);
				})}
				<div
					class="cms-pb-faq__question cms-editable"
					use:editable={{
						value: block.faqs[index].question,
						placeholder: 'Pertanyaan',
						onInput: (v) => (block.faqs[index].question = v)
					}}
				></div>
				<div
					class="cms-pb-faq__answer cms-editable"
					use:editable={{
						value: block.faqs[index].answer,
						multiline: true,
						placeholder: 'Jawaban…',
						onInput: (v) => (block.faqs[index].answer = v)
					}}
				></div>
			</div>
		{/each}
		<button
			type="button"
			class="cms-add-item"
			onclick={() => (block.faqs = [...block.faqs, createFaqItem()])}
		>
			<Plus class="size-4" /> Tambah pertanyaan
		</button>
	</section>
{:else if block.type === 'spacer'}
	<div class="cms-pb-spacer cms-pb-space-{block.space} cms-spacer-visual">
		<span>Jarak {block.space === 'sm' ? 'kecil' : block.space === 'md' ? 'sedang' : 'besar'}</span>
	</div>
{:else}
	{@render settingsHint(`Atur ${BLOCK_TYPE_LABELS[block.type] ?? 'blok'}`)}
{/if}

