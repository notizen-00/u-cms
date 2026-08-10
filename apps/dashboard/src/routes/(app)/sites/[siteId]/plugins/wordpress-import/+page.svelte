<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert } from '$lib/components/ui/alert';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { canManageSite } from '$lib/permissions';
	import { formatDate } from '$lib/utils';
	import type { WordpressImport, WordpressImportStatus } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let imports = $state<WordpressImport[]>(data.imports);
	let fileInput: HTMLInputElement | undefined = $state();
	let selectedFileName = $state<string | null>(null);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let pollingId = $state<string | null>(null);

	const columns = [{ label: 'File' }, { label: 'Status' }, { label: 'Hasil' }, { label: 'Diunggah' }];

	const STATUS_LABEL: Record<WordpressImportStatus, string> = {
		queued: 'Menunggu',
		running: 'Berjalan',
		success: 'Selesai',
		failed: 'Gagal'
	};

	const STATUS_VARIANT: Record<WordpressImportStatus, 'secondary' | 'warning' | 'success' | 'destructive'> = {
		queued: 'secondary',
		running: 'warning',
		success: 'success',
		failed: 'destructive'
	};

	function statsSummary(row: WordpressImport): string {
		if (!row.stats) return '—';
		const { categoriesImported, tagsImported, mediaImported, mediaFailed, pagesImported, newsImported } = row.stats;
		const parts = [
			newsImported ? `${newsImported} berita` : null,
			pagesImported ? `${pagesImported} halaman` : null,
			mediaImported ? `${mediaImported} media` : null,
			categoriesImported ? `${categoriesImported} kategori` : null,
			tagsImported ? `${tagsImported} tag` : null
		].filter(Boolean);
		if (mediaFailed) parts.push(`${mediaFailed} media gagal`);
		return parts.length > 0 ? parts.join(', ') : 'Tidak ada konten baru';
	}

	function onFileChange() {
		const file = fileInput?.files?.[0];
		selectedFileName = file?.name ?? null;
		uploadError = null;
	}

	async function pollUntilDone(id: string) {
		pollingId = id;
		while (pollingId === id) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			const response = await fetch(`/sites/${data.site.id}/plugins/wordpress-import/${id}`);
			if (!response.ok) break;
			const updated = (await response.json()) as WordpressImport;
			imports = imports.map((row) => (row.id === updated.id ? updated : row));

			if (updated.status === 'success' || updated.status === 'failed') {
				pollingId = null;
				if (updated.status === 'success') {
					toast.success(`Import selesai — ${statsSummary(updated)}.`);
				} else {
					toast.error(`Import gagal: ${updated.error ?? 'Terjadi kesalahan.'}`);
				}
			}
		}
	}

	async function upload() {
		const file = fileInput?.files?.[0];
		if (!file) return;

		uploading = true;
		uploadError = null;
		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch(`/sites/${data.site.id}/plugins/wordpress-import/upload`, {
				method: 'POST',
				body: formData
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload as { message?: string }).message ?? 'Upload gagal.');
			}

			const created = payload as WordpressImport;
			imports = [created, ...imports];
			toast.success('File diunggah, import dimulai di latar belakang.');
			if (fileInput) fileInput.value = '';
			selectedFileName = null;

			void pollUntilDone(created.id);
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload gagal.';
		} finally {
			uploading = false;
		}
	}
</script>

<svelte:head>
	<title>WordPress Import — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold">WordPress Import — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Unggah file ekspor WXR (<code>.xml</code>) dari WordPress untuk mengimpor berita, halaman, kategori, tag,
			dan media ke site ini. Mengunggah file yang sama dua kali aman — konten yang sudah pernah diimpor tidak
			akan digandakan.
		</p>
	</div>

	{#if canManage}
		<div class="max-w-xl space-y-3 rounded-xl border bg-card p-5">
			<div class="space-y-1">
				<label for="wxr-file" class="text-sm font-medium">File ekspor WordPress</label>
				<input
					id="wxr-file"
					type="file"
					accept=".xml"
					bind:this={fileInput}
					onchange={onFileChange}
					class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
				/>
			</div>

			{#if uploadError}
				<Alert variant="destructive">{uploadError}</Alert>
			{/if}

			<Button onclick={upload} disabled={!selectedFileName || uploading}>
				{uploading ? 'Mengunggah...' : 'Impor'}
			</Button>
		</div>
	{:else}
		<Alert>Anda tidak memiliki izin untuk menjalankan import pada site ini.</Alert>
	{/if}

	<div class="space-y-3">
		<h2 class="text-sm font-semibold text-muted-foreground">Riwayat Import</h2>
		<DataTable items={imports} {columns} rowKey={(row) => row.id} emptyMessage="Belum ada import.">
			{#snippet row(item: WordpressImport)}
				<TableRow>
					<TableCell class="font-medium">{item.sourceFileName}</TableCell>
					<TableCell>
						<Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
					</TableCell>
					<TableCell class="text-sm text-muted-foreground">
						{item.status === 'failed' ? (item.error ?? 'Terjadi kesalahan.') : statsSummary(item)}
					</TableCell>
					<TableCell class="text-sm text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
				</TableRow>
			{/snippet}
		</DataTable>
	</div>
</div>
