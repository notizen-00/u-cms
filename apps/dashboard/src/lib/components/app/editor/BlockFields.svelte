<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		PAGE_BUILDER_ALIGNS,
		PAGE_BUILDER_COLUMNS,
		PAGE_BUILDER_SPACES,
		PAGE_BUILDER_TONES,
		calendarTitle,
		createCardItem,
		createFaqItem,
		createGalleryItem,
		createStatItem,
		type Block
	} from '$lib/editor/blocks';
	import type { CmsForm } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ImagePlus from '@lucide/svelte/icons/image-plus';

	// `block` is a deeply-reactive $state proxy owned by BlockEditor, so mutating its
	// fields here propagates back without needing $bindable on every property.
	let {
		block,
		onPickImage,
		forms = []
	}: {
		block: Block;
		onPickImage: (blockId: string, target?: string) => void;
		forms?: CmsForm[];
	} = $props();

	function onFormSelect(formId: string) {
		block.formId = formId;
		block.formTitle = forms.find((f) => f.id === formId)?.title ?? '';
	}

	function addRow() {
		const width = block.rows[0]?.length ?? 2;
		block.rows = [...block.rows, Array(width).fill('')];
	}

	function removeRow(index: number) {
		if (block.rows.length <= 2) return; // keep the header plus at least one body row
		block.rows = block.rows.filter((_, i) => i !== index);
	}

	function addColumn() {
		block.rows = block.rows.map((row) => [...row, '']);
	}

	function removeColumn(index: number) {
		if ((block.rows[0]?.length ?? 0) <= 1) return;
		block.rows = block.rows.map((row) => row.filter((_, i) => i !== index));
	}
</script>

{#snippet appearance(showColumns: boolean)}
	<div class="grid gap-3 sm:grid-cols-2 {showColumns ? 'lg:grid-cols-3' : ''}">
		<div class="space-y-1.5">
			<Label>Tone</Label>
			<Select bind:value={block.tone}>
				{#each PAGE_BUILDER_TONES as tone (tone)}
					<option value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>
				{/each}
			</Select>
		</div>
		<div class="space-y-1.5">
			<Label>Perataan</Label>
			<Select bind:value={block.align}>
				{#each PAGE_BUILDER_ALIGNS as align (align)}
					<option value={align}>{align === 'left' ? 'Kiri' : 'Tengah'}</option>
				{/each}
			</Select>
		</div>
		{#if showColumns}
			<div class="space-y-1.5">
				<Label>Jumlah kolom</Label>
				<Select bind:value={block.columnCount}>
					{#each PAGE_BUILDER_COLUMNS as count (count)}
						<option value={count}>{count} kolom</option>
					{/each}
				</Select>
			</div>
		{/if}
	</div>
{/snippet}

{#if block.type === 'heading'}
	<div class="space-y-1.5">
		<Label for="field-heading">Teks Heading</Label>
		<div class="flex gap-2">
			<Select bind:value={block.level} class="w-24">
				<option value={2}>H2</option>
				<option value={3}>H3</option>
				<option value={4}>H4</option>
			</Select>
			<Input id="field-heading" bind:value={block.text} placeholder="Judul bagian..." />
		</div>
	</div>
{:else if block.type === 'paragraph'}
	<div class="space-y-1.5">
		<Label for="field-paragraph">Paragraf</Label>
		<Textarea id="field-paragraph" bind:value={block.text} rows={6} placeholder="Tulis paragraf..." />
		<p class="text-xs text-muted-foreground">Mendukung markdown inline: **tebal**, *miring*, [tautan](url).</p>
	</div>
{:else if block.type === 'quote'}
	<div class="space-y-1.5">
		<Label for="field-quote">Kutipan</Label>
		<Textarea id="field-quote" bind:value={block.text} rows={4} placeholder="Tulis kutipan..." />
	</div>
{:else if block.type === 'code'}
	<div class="space-y-1.5">
		<Label for="field-code">Kode</Label>
		<Textarea id="field-code" bind:value={block.text} rows={8} class="font-mono text-sm" placeholder="Tulis kode..." />
	</div>
{:else if block.type === 'divider'}
	<p class="text-sm text-muted-foreground">Blok pemisah tidak punya pengaturan.</p>
{:else if block.type === 'list'}
	<div class="space-y-2">
		<div class="flex items-center gap-2">
			<Label for="field-list-type">Tipe daftar</Label>
			<Select id="field-list-type" bind:value={block.ordered} class="w-40">
				<option value={false}>Tak berurut</option>
				<option value={true}>Berurut (1, 2, 3)</option>
			</Select>
		</div>
		{#each block.items as _, index (index)}
			<div class="flex items-center gap-2">
				<span class="w-5 text-right text-sm text-muted-foreground">{block.ordered ? `${index + 1}.` : '•'}</span>
				<Input bind:value={block.items[index]} placeholder="Item daftar..." />
				<button
					type="button"
					class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
					onclick={() => (block.items = block.items.length > 1 ? block.items.filter((_, i) => i !== index) : [''])}
					title="Hapus item"
				>
					<Trash2 class="size-3.5" />
				</button>
			</div>
		{/each}
		<Button type="button" variant="ghost" size="sm" onclick={() => (block.items = [...block.items, ''])}>
			<Plus class="size-3.5" /> Tambah Item
		</Button>
	</div>
{:else if block.type === 'image'}
	<div class="space-y-3">
		{#if block.url}
			<img src={block.url} alt={block.alt} class="max-h-64 rounded-md border border-border object-contain" />
		{/if}
		<Button type="button" variant="outline" size="sm" onclick={() => onPickImage(block.id)}>
			<ImagePlus class="size-3.5" />
			{block.url ? 'Ganti Gambar' : 'Pilih dari Pustaka Media'}
		</Button>
		<div class="space-y-1.5">
			<Label for="field-image-url">URL Gambar</Label>
			<Input id="field-image-url" bind:value={block.url} placeholder="https://..." />
		</div>
		<div class="space-y-1.5">
			<Label for="field-image-alt">Teks Alternatif</Label>
			<Input id="field-image-alt" bind:value={block.alt} placeholder="Deskripsi gambar untuk aksesibilitas" />
		</div>
	</div>
{:else if block.type === 'button'}
	<div class="space-y-3">
		<div class="space-y-1.5">
			<Label for="field-button-label">Label Tombol</Label>
			<Input id="field-button-label" bind:value={block.label} placeholder="Selengkapnya" />
		</div>
		<div class="space-y-1.5">
			<Label for="field-button-url">Tautan Tujuan</Label>
			<Input id="field-button-url" bind:value={block.url} placeholder="https://... atau /halaman" />
		</div>
	</div>
{:else if block.type === 'embed'}
	<div class="space-y-3">
		<div class="space-y-1.5">
			<Label for="field-embed-url">URL Video / Embed</Label>
			<Input id="field-embed-url" bind:value={block.url} placeholder="https://youtube.com/watch?v=..." />
			<p class="text-xs text-muted-foreground">
				Tautan YouTube dan Vimeo otomatis dikonversi ke format embed. URL lain dipakai apa adanya.
			</p>
		</div>
	</div>
{:else if block.type === 'calendar'}
	<div class="space-y-3">
		<div class="space-y-1.5">
			<Label for="field-calendar-month">Bulan</Label>
			<Input id="field-calendar-month" type="month" bind:value={block.month} />
			<p class="text-xs text-muted-foreground">
				Kalender di-render sebagai tabel statis ({calendarTitle(block.month) || 'bulan belum dipilih'}) — situs publik
				adalah build statis, jadi tidak ada JavaScript yang berjalan saat dilihat pengunjung.
			</p>
		</div>
	</div>
{:else if block.type === 'columns'}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<Label>Isi Kolom</Label>
			<div class="flex gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (block.columns = block.columns.length > 1 ? block.columns.slice(0, -1) : block.columns)}
				>
					Kurangi
				</Button>
				<Button type="button" variant="ghost" size="sm" onclick={() => (block.columns = [...block.columns, ''])}>
					<Plus class="size-3.5" /> Tambah Kolom
				</Button>
			</div>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each block.columns as _, index (index)}
				<div class="space-y-1.5">
					<Label for="field-column-{index}">Kolom {index + 1}</Label>
					<Textarea id="field-column-{index}" bind:value={block.columns[index]} rows={5} />
				</div>
			{/each}
		</div>
	</div>
{:else if block.type === 'table'}
	<div class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<Label>Isi Tabel (baris pertama adalah header)</Label>
			<div class="flex gap-2">
				<Button type="button" variant="ghost" size="sm" onclick={addColumn}>
					<Plus class="size-3.5" /> Kolom
				</Button>
				<Button type="button" variant="ghost" size="sm" onclick={addRow}>
					<Plus class="size-3.5" /> Baris
				</Button>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<tbody>
					{#each block.rows as row, rowIndex (rowIndex)}
						<tr>
							{#each row as _, colIndex (colIndex)}
								<td class="border border-border p-1">
									<Input
										bind:value={block.rows[rowIndex][colIndex]}
										class="h-8 border-none shadow-none focus-visible:ring-1 {rowIndex === 0 ? 'font-semibold' : ''}"
										placeholder={rowIndex === 0 ? `Kolom ${colIndex + 1}` : ''}
									/>
								</td>
							{/each}
							<td class="w-8 p-1">
								{#if rowIndex > 0}
									<button
										type="button"
										class="rounded p-1 text-muted-foreground hover:bg-muted"
										onclick={() => removeRow(rowIndex)}
										title="Hapus baris"
									>
										<Trash2 class="size-3.5" />
									</button>
								{:else}
									<button
										type="button"
										class="rounded p-1 text-muted-foreground hover:bg-muted"
										onclick={() => removeColumn(row.length - 1)}
										title="Hapus kolom terakhir"
									>
										<Trash2 class="size-3.5" />
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{:else if block.type === 'form'}
	<div class="space-y-1.5">
		<Label for="field-form">Pilih Formulir</Label>
		{#if forms.length === 0}
			<p class="text-sm text-muted-foreground">
				Belum ada formulir di site ini. Buat dulu lewat menu <strong>Formulir</strong> di sidebar.
			</p>
		{:else}
			<Select id="field-form" value={block.formId} onchange={(e) => onFormSelect(e.currentTarget.value)}>
				<option value="" disabled selected={!block.formId}>Pilih formulir…</option>
				{#each forms as f (f.id)}
					<option value={f.id} selected={f.id === block.formId}>{f.title}</option>
				{/each}
			</Select>
			<p class="text-xs text-muted-foreground">
				Field dan tampilan formulir diambil otomatis dari pengaturan formulir saat situs di-build.
			</p>
		{/if}
	</div>
{:else if block.type === 'hero'}
	<div class="space-y-4">
		{@render appearance(false)}
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="field-hero-eyebrow">Eyebrow</Label>
				<Input id="field-hero-eyebrow" bind:value={block.eyebrow} placeholder="Selamat datang" />
			</div>
			<div class="space-y-1.5">
				<Label for="field-hero-title">Judul</Label>
				<Input id="field-hero-title" bind:value={block.text} placeholder="Judul utama yang kuat" />
			</div>
		</div>
		<div class="space-y-1.5">
			<Label for="field-hero-body">Deskripsi</Label>
			<Textarea id="field-hero-body" bind:value={block.body} rows={4} placeholder="Jelaskan nilai utama secara singkat..." />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="field-hero-label">Label tombol</Label>
				<Input id="field-hero-label" bind:value={block.label} placeholder="Selengkapnya" />
			</div>
			<div class="space-y-1.5">
				<Label for="field-hero-url">Tautan tombol</Label>
				<Input id="field-hero-url" bind:value={block.url} placeholder="/halaman atau https://..." />
			</div>
		</div>
		<div class="rounded-lg border border-border p-3">
			<div class="mb-3 flex flex-wrap items-center gap-3">
				{#if block.imageUrl}
					<img src={block.imageUrl} alt={block.imageAlt} class="h-24 w-36 rounded-md object-cover" />
				{/if}
				<Button type="button" variant="outline" size="sm" onclick={() => onPickImage(block.id, 'hero')}>
					<ImagePlus class="size-3.5" /> {block.imageUrl ? 'Ganti gambar' : 'Pilih gambar hero'}
				</Button>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label for="field-hero-image">URL gambar</Label>
					<Input id="field-hero-image" bind:value={block.imageUrl} placeholder="https://..." />
				</div>
				<div class="space-y-1.5">
					<Label for="field-hero-alt">Teks alternatif</Label>
					<Input id="field-hero-alt" bind:value={block.imageAlt} placeholder="Deskripsi gambar" />
				</div>
			</div>
		</div>
	</div>
{:else if block.type === 'callout'}
	<div class="space-y-4">
		{@render appearance(false)}
		<div class="space-y-1.5">
			<Label for="field-callout-title">Judul</Label>
			<Input id="field-callout-title" bind:value={block.text} placeholder="Ajakan utama" />
		</div>
		<div class="space-y-1.5">
			<Label for="field-callout-body">Deskripsi</Label>
			<Textarea id="field-callout-body" bind:value={block.body} rows={4} />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="field-callout-label">Label tombol</Label>
				<Input id="field-callout-label" bind:value={block.label} />
			</div>
			<div class="space-y-1.5">
				<Label for="field-callout-url">Tautan tombol</Label>
				<Input id="field-callout-url" bind:value={block.url} placeholder="/kontak" />
			</div>
		</div>
	</div>
{:else if block.type === 'cards'}
	<div class="space-y-4">
		{@render appearance(true)}
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="field-cards-title">Judul bagian</Label>
				<Input id="field-cards-title" bind:value={block.text} placeholder="Layanan unggulan" />
			</div>
			<div class="space-y-1.5">
				<Label for="field-cards-body">Deskripsi bagian</Label>
				<Input id="field-cards-body" bind:value={block.body} />
			</div>
		</div>
		<div class="space-y-3">
			{#each block.cards as card, index (card.id)}
				<div class="rounded-lg border border-border p-4">
					<div class="mb-3 flex items-center justify-between">
						<p class="text-sm font-semibold">Kartu {index + 1}</p>
						<button type="button" class="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30" disabled={block.cards.length <= 1} onclick={() => (block.cards = block.cards.filter((item) => item.id !== card.id))} title="Hapus kartu">
							<Trash2 class="size-4" />
						</button>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="field-card-title-{index}">Judul</Label>
							<Input id="field-card-title-{index}" bind:value={block.cards[index].title} />
						</div>
						<div class="space-y-1.5">
							<Label for="field-card-text-{index}">Deskripsi</Label>
							<Input id="field-card-text-{index}" bind:value={block.cards[index].text} />
						</div>
						<div class="space-y-1.5">
							<Label for="field-card-label-{index}">Label tautan</Label>
							<Input id="field-card-label-{index}" bind:value={block.cards[index].label} />
						</div>
						<div class="space-y-1.5">
							<Label for="field-card-url-{index}">Tautan</Label>
							<Input id="field-card-url-{index}" bind:value={block.cards[index].url} />
						</div>
					</div>
					<div class="mt-3 flex flex-wrap items-center gap-3">
						{#if card.imageUrl}<img src={card.imageUrl} alt={card.imageAlt} class="h-16 w-24 rounded object-cover" />{/if}
						<Button type="button" variant="outline" size="sm" onclick={() => onPickImage(block.id, `card:${card.id}`)}>
							<ImagePlus class="size-3.5" /> {card.imageUrl ? 'Ganti gambar' : 'Pilih gambar'}
						</Button>
					</div>
					<div class="mt-3 grid gap-2 sm:grid-cols-2">
						<Input bind:value={block.cards[index].imageUrl} placeholder="URL gambar" />
						<Input bind:value={block.cards[index].imageAlt} placeholder="Teks alternatif" />
					</div>
				</div>
			{/each}
			<Button type="button" variant="outline" size="sm" onclick={() => (block.cards = [...block.cards, createCardItem()])}>
				<Plus class="size-3.5" /> Tambah kartu
			</Button>
		</div>
	</div>
{:else if block.type === 'gallery'}
	<div class="space-y-4">
		{@render appearance(true)}
		<div class="space-y-1.5">
			<Label for="field-gallery-title">Judul galeri</Label>
			<Input id="field-gallery-title" bind:value={block.text} placeholder="Galeri kegiatan" />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each block.gallery as item, index (item.id)}
				<div class="rounded-lg border border-border p-3">
					<div class="mb-2 flex items-start justify-between gap-2">
						{#if item.url}<img src={item.url} alt={item.alt} class="h-28 min-w-0 flex-1 rounded object-cover" />{:else}<div class="grid h-28 min-w-0 flex-1 place-items-center rounded bg-muted text-xs text-muted-foreground">Belum ada gambar</div>{/if}
						<button type="button" class="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30" disabled={block.gallery.length <= 1} onclick={() => (block.gallery = block.gallery.filter((entry) => entry.id !== item.id))} title="Hapus gambar"><Trash2 class="size-4" /></button>
					</div>
					<Button type="button" variant="outline" size="sm" onclick={() => onPickImage(block.id, `gallery:${item.id}`)}><ImagePlus class="size-3.5" /> Pilih gambar</Button>
					<div class="mt-3 space-y-2">
						<Input bind:value={block.gallery[index].url} placeholder="URL gambar" />
						<Input bind:value={block.gallery[index].alt} placeholder="Teks alternatif" />
						<Input bind:value={block.gallery[index].caption} placeholder="Caption (opsional)" />
					</div>
				</div>
			{/each}
		</div>
		<Button type="button" variant="outline" size="sm" onclick={() => (block.gallery = [...block.gallery, createGalleryItem()])}><Plus class="size-3.5" /> Tambah gambar</Button>
	</div>
{:else if block.type === 'stats'}
	<div class="space-y-4">
		{@render appearance(true)}
		<div class="space-y-1.5">
			<Label for="field-stats-title">Judul bagian</Label>
			<Input id="field-stats-title" bind:value={block.text} placeholder="Capaian kami" />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each block.stats as item, index (item.id)}
				<div class="relative rounded-lg border border-border p-3 pr-10">
					<button type="button" class="absolute right-2 top-2 rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30" disabled={block.stats.length <= 1} onclick={() => (block.stats = block.stats.filter((entry) => entry.id !== item.id))} title="Hapus statistik"><Trash2 class="size-4" /></button>
					<div class="space-y-2">
						<Input bind:value={block.stats[index].value} placeholder="100+" class="text-lg font-bold" />
						<Input bind:value={block.stats[index].label} placeholder="Label statistik" />
					</div>
				</div>
			{/each}
		</div>
		<Button type="button" variant="outline" size="sm" onclick={() => (block.stats = [...block.stats, createStatItem()])}><Plus class="size-3.5" /> Tambah statistik</Button>
	</div>
{:else if block.type === 'faq'}
	<div class="space-y-4">
		{@render appearance(false)}
		<div class="space-y-1.5">
			<Label for="field-faq-title">Judul bagian</Label>
			<Input id="field-faq-title" bind:value={block.text} placeholder="Pertanyaan yang sering diajukan" />
		</div>
		<div class="space-y-3">
			{#each block.faqs as item, index (item.id)}
				<div class="relative rounded-lg border border-border p-4 pr-11">
					<button type="button" class="absolute right-2 top-2 rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30" disabled={block.faqs.length <= 1} onclick={() => (block.faqs = block.faqs.filter((entry) => entry.id !== item.id))} title="Hapus pertanyaan"><Trash2 class="size-4" /></button>
					<div class="space-y-2">
						<Input bind:value={block.faqs[index].question} placeholder="Pertanyaan" />
						<Textarea bind:value={block.faqs[index].answer} rows={3} placeholder="Jawaban" />
					</div>
				</div>
			{/each}
		</div>
		<Button type="button" variant="outline" size="sm" onclick={() => (block.faqs = [...block.faqs, createFaqItem()])}><Plus class="size-3.5" /> Tambah pertanyaan</Button>
	</div>
{:else if block.type === 'spacer'}
	<div class="space-y-2">
		<Label for="field-spacer-size">Ukuran jarak</Label>
		<Select id="field-spacer-size" bind:value={block.space}>
			{#each PAGE_BUILDER_SPACES as space (space)}
				<option value={space}>{space === 'sm' ? 'Kecil' : space === 'md' ? 'Sedang' : 'Besar'}</option>
			{/each}
		</Select>
		<p class="text-xs text-muted-foreground">Gunakan jarak untuk memisahkan bagian halaman secara visual.</p>
	</div>
{:else if block.type === 'html'}
	<div class="space-y-1.5">
		<Label for="field-html">HTML Kustom</Label>
		<Textarea id="field-html" bind:value={block.text} rows={8} class="font-mono text-sm" placeholder="<div>...</div>" />
		<p class="text-xs text-muted-foreground">
			Markup ditulis apa adanya ke konten. Pratinjau tetap disanitasi, tapi tulis hanya HTML yang Anda percaya.
		</p>
	</div>
{/if}
