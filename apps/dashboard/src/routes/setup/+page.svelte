<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import CircleGauge from '@lucide/svelte/icons/gauge';
	import Clock3 from '@lucide/svelte/icons/clock-3';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Globe2 from '@lucide/svelte/icons/globe-2';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Link2 from '@lucide/svelte/icons/link-2';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import Mail from '@lucide/svelte/icons/mail';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import UserRound from '@lucide/svelte/icons/user-round';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let step = $state(Math.min(Number(form?.step ?? 1), 3));
	let submitting = $state(false);
	let localMessage = $state('');
	let setupToken = $state(form?.values?.setupToken ?? '');
	let adminName = $state(form?.values?.adminName ?? '');
	let adminEmail = $state(form?.values?.adminEmail ?? '');
	let adminPassword = $state('');
	let confirmPassword = $state('');
	let siteName = $state(form?.values?.siteName ?? '');
	let siteSlug = $state(form?.values?.siteSlug ?? '');
	let siteDomain = $state(form?.values?.siteDomain ?? '');
	let slugEdited = $state(Boolean(form?.values?.siteSlug));
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	const steps = [
		{ number: 1, eyebrow: 'Langkah 1', label: 'Selamat Datang' },
		{ number: 2, eyebrow: 'Langkah 2', label: 'Akun Super Admin' },
		{ number: 3, eyebrow: 'Langkah 3', label: 'Website Pertama' }
	];

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.replace(/-{2,}/g, '-');
	}

	function updateSiteName(value: string): void {
		siteName = value;
		if (!slugEdited) siteSlug = slugify(value);
	}

	function passwordScore(value: string): number {
		if (!value) return 0;

		let score = 0;
		if (value.length >= 8) score += 25;
		if (value.length >= 12) score += 20;
		if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 20;
		if (/\d/.test(value)) score += 20;
		if (/[^A-Za-z0-9]/.test(value)) score += 15;
		return Math.min(score, 100);
	}

	function passwordStatus(value: string): { label: string; className: string } {
		const score = passwordScore(value);
		if (score === 0) return { label: 'Gunakan minimal 8 karakter.', className: 'bg-slate-200' };
		if (score < 50) return { label: 'Lemah, tambahkan huruf besar dan angka.', className: 'bg-rose-500' };
		if (score < 75) return { label: 'Sedang, gunakan kombinasi huruf dan angka.', className: 'bg-amber-400' };
		return { label: 'Kuat, kata sandi sudah aman.', className: 'bg-emerald-500' };
	}

	function nextStep(): void {
		localMessage = '';

		if (step === 2) {
			if (!adminName.trim() || !adminEmail.trim()) {
				localMessage = 'Nama dan email super admin wajib diisi.';
				return;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
				localMessage = 'Format email super admin tidak valid.';
				return;
			}
			if (adminPassword.length < 8) {
				localMessage = 'Kata sandi minimal 8 karakter.';
				return;
			}
			if (adminPassword !== confirmPassword) {
				localMessage = 'Konfirmasi kata sandi tidak sama.';
				return;
			}
		}

		step = Math.min(3, step + 1);
	}

	function previousStep(): void {
		localMessage = '';
		step = Math.max(1, step - 1);
	}

	function validateFinalStep(event: SubmitEvent): void {
		localMessage = '';

		if (!siteName.trim() || !siteSlug.trim()) {
			event.preventDefault();
			localMessage = 'Nama dan slug website wajib diisi.';
			return;
		}

		if (!/^[a-z0-9-]+$/.test(siteSlug)) {
			event.preventDefault();
			localMessage = 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.';
		}
	}
</script>

<svelte:head>
	<title>Setup Awal — Unej CMS</title>
	<meta
		name="description"
		content="Wizard instalasi awal Unej CMS untuk membuat super admin dan website pertama."
	/>
</svelte:head>

<div class="min-h-[100dvh] border-[3px] border-[#7c73f4] bg-[#f9f8ff] px-4 py-5 sm:px-6">
	<div class="mx-auto w-full max-w-[980px]">
		<form
			method="POST"
			onsubmit={validateFinalStep}
			use:enhance={() => {
				submitting = true;
				return async ({ update, result }) => {
					submitting = false;
					await update();
					if (result.type === 'failure' && result.data && 'step' in result.data) {
						step = Math.min(Number(result.data.step), 3);
					}
				};
			}}
		>
			<input type="hidden" name="setupToken" value={setupToken} />
			<input type="hidden" name="adminName" value={adminName} />
			<input type="hidden" name="adminEmail" value={adminEmail} />
			<input type="hidden" name="adminPassword" value={adminPassword} />
			<input type="hidden" name="confirmPassword" value={confirmPassword} />
			<input type="hidden" name="siteName" value={siteName} />
			<input type="hidden" name="siteSlug" value={siteSlug} />
			<input type="hidden" name="siteDomain" value={siteDomain} />

			<div
				class="overflow-hidden rounded-md border border-[#dbe3ec] bg-white shadow-[0_2px_8px_rgba(15,62,94,0.06)] md:grid md:min-h-[520px] md:grid-cols-[255px_minmax(0,1fr)]"
			>
				<aside class="border-b border-[#e5ebf1] bg-white px-7 py-8 md:border-r md:border-b-0">
					<div class="flex items-center gap-2.5 text-[#003f6b]">
						<div class="flex size-8 items-center justify-center rounded-sm bg-[#004d7c] text-sm font-bold text-white">
							U
						</div>
						<span class="text-[17px] font-bold tracking-tight">Unej CMS</span>
					</div>

					<nav aria-label="Tahapan setup" class="mt-9">
						<ol class="grid grid-cols-3 gap-2 md:block md:space-y-0">
							{#each steps as item, index}
								<li class="relative flex min-w-0 gap-3 pb-0 md:pb-8">
									{#if index < steps.length - 1}
										<span
											aria-hidden="true"
											class={step > item.number
												? 'absolute top-8 left-[15px] hidden h-[calc(100%-1.75rem)] w-px bg-[#006497] md:block'
												: 'absolute top-8 left-[15px] hidden h-[calc(100%-1.75rem)] w-px bg-[#d9e0e7] md:block'}
										></span>
									{/if}

									<div
										class={step > item.number
											? 'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#006497] text-white'
											: step === item.number
												? 'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#006497] bg-white text-[12px] font-semibold text-[#005b8e]'
												: 'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#cbd3dc] bg-white text-[12px] font-semibold text-[#a9b2bd]'}
									>
										{#if step > item.number}
											<Check class="size-4" strokeWidth={3} />
										{:else}
											{item.number}
										{/if}
									</div>

									<div class="min-w-0 pt-0.5">
										<p
											class={step >= item.number
												? 'hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-[#075784] sm:block'
												: 'hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aab3bd] sm:block'}
										>
											{item.eyebrow}
										</p>
										<p
											class={step === item.number
												? 'mt-1 truncate text-[13px] font-bold leading-tight text-[#004d7c] sm:whitespace-normal'
												: step > item.number
													? 'mt-1 truncate text-[13px] font-semibold leading-tight text-[#0e2f44] sm:whitespace-normal'
													: 'mt-1 truncate text-[13px] font-semibold leading-tight text-[#aab3bd] sm:whitespace-normal'}
										>
											{item.label}
										</p>
									</div>
								</li>
							{/each}
						</ol>
					</nav>

					<div class="mt-7 hidden rounded border border-[#dbe5f3] bg-[#f2f5ff] p-4 md:block">
						<div class="flex gap-3">
							<Clock3 class="mt-0.5 size-5 shrink-0 text-[#006497]" />
							<div>
								<p class="text-[11px] font-bold text-[#17384f]">Instalasi 5 Menit</p>
								<p class="mt-1 text-[10px] leading-[1.35] text-[#516577]">
									Anda hampir selesai. Pengaturan awal ini hanya membutuhkan waktu beberapa menit.
								</p>
							</div>
						</div>
					</div>
				</aside>

				<section class="relative bg-[radial-gradient(circle_at_top_right,rgba(221,238,246,0.45),transparent_40%)] px-6 py-8 sm:px-10 md:px-14">
					{#if step === 1}
						<div class="mx-auto flex h-full max-w-[560px] flex-col">
							<div>
								<div class="mb-5 flex size-11 items-center justify-center rounded-md bg-[#e8f2f8] text-[#005c8e]">
									<ShieldCheck class="size-6" />
								</div>
								<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#006497]">Instalasi Awal</p>
								<h1 class="mt-2 text-[24px] font-bold tracking-tight text-[#071827]">Selamat Datang di Unej CMS</h1>
								<p class="mt-2 max-w-[500px] text-[12px] leading-relaxed text-[#536a7a]">
									Siapkan akun administrator dan website pertama Anda. Semua data dibuat dalam satu transaksi yang aman.
								</p>
							</div>

							<div class="mt-8 space-y-5">
								{#if form?.message}
									<Alert variant="destructive">{form.message}</Alert>
								{/if}

								<div class="rounded border border-[#dde6ee] bg-white/80 p-4">
									<div class="flex gap-3">
										<KeyRound class="mt-0.5 size-5 shrink-0 text-[#006497]" />
										<div>
											<p class="text-[12px] font-semibold text-[#17384f]">Setup token opsional</p>
											<p class="mt-1 text-[11px] leading-relaxed text-[#607483]">
												Isi hanya jika backend menggunakan <code>SETUP_TOKEN</code>. Nilainya tersedia di log container API.
											</p>
										</div>
									</div>
								</div>

								<div class="space-y-1.5">
									<label for="setup-token" class="text-[11px] font-semibold text-[#17384f]">Setup Token</label>
									<div class="relative">
										<KeyRound class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="setup-token"
											type="password"
											autocomplete="off"
											placeholder="Kosongkan jika tidak digunakan"
											bind:value={setupToken}
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-3 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
									</div>
								</div>
							</div>

							<div class="mt-auto flex justify-end border-t border-[#e2e8ee] pt-5">
								<Button
									type="button"
									onclick={nextStep}
									class="h-9 rounded-sm bg-[#00527f] px-5 text-[11px] font-semibold text-white shadow-none hover:bg-[#003f64]"
								>
									Mulai
									<ArrowRight class="size-4" />
								</Button>
							</div>
						</div>
					{:else if step === 2}
						<div class="mx-auto flex h-full max-w-[560px] flex-col">
							<div>
								<h1 class="text-[22px] font-bold tracking-tight text-[#071827]">Buat Akun Super Admin</h1>
								<p class="mt-1.5 max-w-[500px] text-[12px] leading-relaxed text-[#536a7a]">
									Akun ini memiliki hak akses penuh ke sistem Unej CMS. Anda dapat menambahkan pengguna lain nanti.
								</p>
							</div>

							<div class="mt-7 space-y-4">
								{#if localMessage}
									<Alert variant="destructive">{localMessage}</Alert>
								{/if}
								{#if form?.message}
									<Alert variant="destructive">{form.message}</Alert>
								{/if}

								<div class="space-y-1.5">
									<label for="admin-name" class="text-[11px] font-semibold text-[#17384f]">Nama Lengkap</label>
									<div class="relative">
										<UserRound class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="admin-name"
											autocomplete="name"
											bind:value={adminName}
											placeholder="Masukkan nama Anda"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-3 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
									</div>
									<FormFieldError errors={form?.errors} field="admin.name" />
								</div>

								<div class="space-y-1.5">
									<label for="admin-email" class="text-[11px] font-semibold text-[#17384f]">Alamat Email</label>
									<div class="relative">
										<Mail class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="admin-email"
											type="email"
											autocomplete="email"
											bind:value={adminEmail}
											placeholder="admin@unej.ac.id"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-3 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
									</div>
									<p class="text-[10px] text-[#728592]">Akan digunakan untuk login dan notifikasi sistem.</p>
									<FormFieldError errors={form?.errors} field="admin.email" />
								</div>

								<div class="space-y-1.5">
									<label for="admin-password" class="text-[11px] font-semibold text-[#17384f]">Kata Sandi</label>
									<div class="relative">
										<LockKeyhole class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="admin-password"
											type={showPassword ? 'text' : 'password'}
											autocomplete="new-password"
											bind:value={adminPassword}
											minlength={8}
											placeholder="Minimal 8 karakter"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-10 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
										<button
											type="button"
											aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
											onclick={() => (showPassword = !showPassword)}
											class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#728592] hover:bg-[#eef3f6] hover:text-[#005b8e]"
										>
											{#if showPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
										</button>
									</div>
									<div class="h-1 overflow-hidden bg-[#e2e8ee]">
										<div
											class={`h-full transition-all duration-300 ${passwordStatus(adminPassword).className}`}
											style={`width: ${passwordScore(adminPassword)}%`}
										></div>
									</div>
									<p class="text-[10px] text-[#d48316]">{passwordStatus(adminPassword).label}</p>
									<FormFieldError errors={form?.errors} field="admin.password" />
								</div>

								<div class="space-y-1.5">
									<label for="confirm-password" class="text-[11px] font-semibold text-[#17384f]">Konfirmasi Kata Sandi</label>
									<div class="relative">
										<LockKeyhole class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="confirm-password"
											type={showConfirmPassword ? 'text' : 'password'}
											autocomplete="new-password"
											bind:value={confirmPassword}
											minlength={8}
											placeholder="Ulangi kata sandi"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-10 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
										<button
											type="button"
											aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
											onclick={() => (showConfirmPassword = !showConfirmPassword)}
											class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#728592] hover:bg-[#eef3f6] hover:text-[#005b8e]"
										>
											{#if showConfirmPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
										</button>
									</div>
									<FormFieldError errors={form?.errors} field="confirmPassword" />
								</div>
							</div>

							<div class="mt-auto flex items-center justify-between border-t border-[#e2e8ee] pt-5">
								<Button
									type="button"
									variant="ghost"
									onclick={previousStep}
									class="h-9 rounded-sm px-3 text-[11px] font-medium text-[#466071] shadow-none hover:bg-[#eef3f6]"
								>
									<ArrowLeft class="size-4" />
									Kembali
								</Button>
								<Button
									type="button"
									onclick={nextStep}
									class="h-9 rounded-sm bg-[#00527f] px-5 text-[11px] font-semibold text-white shadow-none hover:bg-[#003f64]"
								>
									Lanjutkan
									<ArrowRight class="size-4" />
								</Button>
							</div>
						</div>
					{:else}
						<div class="mx-auto flex h-full max-w-[560px] flex-col">
							<div>
								<h1 class="text-[22px] font-bold tracking-tight text-[#071827]">Buat Website Pertama</h1>
								<p class="mt-1.5 max-w-[500px] text-[12px] leading-relaxed text-[#536a7a]">
									Tentukan identitas website pertama. Website tambahan dapat dibuat setelah Anda masuk ke dashboard.
								</p>
							</div>

							<div class="mt-7 space-y-4">
								{#if localMessage}
									<Alert variant="destructive">{localMessage}</Alert>
								{/if}
								{#if form?.message}
									<Alert variant="destructive">{form.message}</Alert>
								{/if}

								<div class="space-y-1.5">
									<label for="site-name" class="text-[11px] font-semibold text-[#17384f]">Nama Website</label>
									<div class="relative">
										<Globe2 class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="site-name"
											value={siteName}
											oninput={(event) => updateSiteName(event.currentTarget.value)}
											placeholder="Fakultas Kesehatan Masyarakat"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-3 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
									</div>
									<FormFieldError errors={form?.errors} field="site.name" />
								</div>

								<div class="space-y-1.5">
									<label for="site-slug" class="text-[11px] font-semibold text-[#17384f]">Slug Website</label>
									<div class="relative">
										<Link2 class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="site-slug"
											bind:value={siteSlug}
											oninput={() => (slugEdited = true)}
											pattern="^[a-z0-9-]+$"
											placeholder="fkm"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-3 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
									</div>
									<p class="text-[10px] text-[#728592]">Huruf kecil, angka, dan tanda hubung. Contoh: <code>fkm</code>.</p>
									<FormFieldError errors={form?.errors} field="site.slug" />
								</div>

								<div class="space-y-1.5">
									<label for="site-domain" class="text-[11px] font-semibold text-[#17384f]">
										Domain <span class="font-normal text-[#728592]">(Opsional)</span>
									</label>
									<div class="relative">
										<CircleGauge class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7a8b98]" />
										<input
											id="site-domain"
											bind:value={siteDomain}
											placeholder="fkm.unej.ac.id"
											class="h-10 w-full rounded-none border border-[#ccd8e2] bg-white pr-3 pl-10 text-[12px] text-[#17384f] outline-none transition placeholder:text-[#91a0ac] focus:border-[#006497] focus:ring-2 focus:ring-[#006497]/10"
										/>
									</div>
									<p class="text-[10px] text-[#728592]">Masukkan hostname tanpa <code>https://</code>.</p>
									<FormFieldError errors={form?.errors} field="site.domain" />
								</div>

								<div class="rounded border border-[#dbe5ed] bg-[#f8fbfd] p-4">
									<p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5b7282]">Ringkasan Setup</p>
									<div class="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
										<div>
											<p class="text-[#7a8d9a]">Super Admin</p>
											<p class="mt-0.5 font-semibold text-[#17384f]">{adminName}</p>
											<p class="text-[#5e7382]">{adminEmail}</p>
										</div>
										<div>
											<p class="text-[#7a8d9a]">Website</p>
											<p class="mt-0.5 font-semibold text-[#17384f]">{siteName || 'Belum diisi'}</p>
											<p class="text-[#5e7382]">/{siteSlug || 'slug-website'}</p>
										</div>
									</div>
								</div>

								{#if form?.errors?.length}
									<Alert variant="destructive">
										<div>
											<p class="font-medium">Data belum dapat diproses</p>
											<ul class="mt-1 list-disc space-y-0.5 pl-4 text-xs">
												{#each form.errors as item}<li>{item.message}</li>{/each}
											</ul>
										</div>
									</Alert>
								{/if}
							</div>

							<div class="mt-auto flex items-center justify-between border-t border-[#e2e8ee] pt-5">
								<Button
									type="button"
									variant="ghost"
									onclick={previousStep}
									disabled={submitting}
									class="h-9 rounded-sm px-3 text-[11px] font-medium text-[#466071] shadow-none hover:bg-[#eef3f6]"
								>
									<ArrowLeft class="size-4" />
									Kembali
								</Button>
								<Button
									type="submit"
									disabled={submitting}
									class="h-9 rounded-sm bg-[#00527f] px-5 text-[11px] font-semibold text-white shadow-none hover:bg-[#003f64]"
								>
									{#if submitting}<LoaderCircle class="size-4 animate-spin" />{/if}
									Selesaikan Setup
									{#if !submitting}<ArrowRight class="size-4" />{/if}
								</Button>
							</div>
						</div>
					{/if}
				</section>
			</div>
		</form>
	</div>
</div>
