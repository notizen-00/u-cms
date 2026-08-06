<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { calendarTitle, type Block } from '$lib/editor/blocks';
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
		onPickImage: (blockId: string) => void;
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
{:else if block.type === 'html'}
	<div class="space-y-1.5">
		<Label for="field-html">HTML Kustom</Label>
		<Textarea id="field-html" bind:value={block.text} rows={8} class="font-mono text-sm" placeholder="<div>...</div>" />
		<p class="text-xs text-muted-foreground">
			Markup ditulis apa adanya ke konten. Pratinjau tetap disanitasi, tapi tulis hanya HTML yang Anda percaya.
		</p>
	</div>
{/if}
