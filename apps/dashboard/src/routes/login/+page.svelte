<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert } from '$lib/components/ui/alert';

	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import Mail from '@lucide/svelte/icons/mail';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
	let showPassword = $state(false);
	let rememberMe = $state(false);

	const currentYear = new Date().getFullYear();
</script>

<svelte:head>
	<title>Masuk — Unej CMS</title>
	<meta
		name="description"
		content="Masuk ke panel administrasi Unej CMS."
	/>
</svelte:head>

<main
	class="flex min-h-screen items-start justify-center bg-[#f9f8ff] px-4 py-3 sm:py-6"
>
	<section
		class="w-full max-w-90 rounded-[7px] border border-[#dce2e8] bg-white px-6 py-7 shadow-[0_2px_6px_rgba(15,23,42,0.08)] sm:px-7"
	>
		<div class="mb-7 flex flex-col items-center text-center">
			<!-- Logo -->
			<div
				class="mb-4 grid h-13.5 w-13.5 place-items-center rounded-lg bg-[#075985] shadow-sm"
				aria-hidden="true"
			>
				<div class="grid grid-cols-2 gap-0.75">
					<span class="h-2.25 w-2.25 bg-white"></span>
					<span class="h-2.25 w-2.25 bg-white"></span>
					<span class="h-2.25 w-2.25 bg-white"></span>
					<span class="h-2.25 w-2.25 bg-white"></span>
				</div>
			</div>

			<h1 class="text-[20px] font-bold tracking-[-0.02em] text-[#07152b]">
				Unej CMS
			</h1>

			<p class="mt-2 text-[12px] text-[#64748b]">
				Silakan masuk ke panel admin.
			</p>
		</div>

		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				submitting = true;

				return async ({ update }) => {
					try {
						await update();
					} finally {
						submitting = false;
					}
				};
			}}
		>
			<input
				type="hidden"
				name="redirectTo"
				value={data.redirectTo}
			/>

			{#if form?.message}
				<Alert variant="destructive" class="text-xs">
					{form.message}
				</Alert>
			{/if}

			{#if form?.errors?.length}
				<Alert variant="destructive" class="text-xs">
					{form.errors[0].message}
				</Alert>
			{/if}

			<!-- Email -->
			<div class="space-y-1.5">
				<label
					for="email"
					class="block text-[11px] font-medium text-[#1e293b]"
				>
					Email Institusi
				</label>

				<div
					class="flex h-9.5 items-center border border-[#cbd5e1] bg-[#fbfbff] transition-colors focus-within:border-[#0369a1] focus-within:ring-1 focus-within:ring-[#0369a1]"
				>
					<div class="grid w-10 shrink-0 place-items-center text-[#476582]">
						<Mail size={17} strokeWidth={1.8} />
					</div>

					<!-- svelte-ignore a11y_autofocus -->
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						inputmode="email"
						placeholder="admin@unej.ac.id"
						value={form?.email ?? ''}
						required
						autofocus
						class="h-full min-w-0 flex-1 border-0 bg-transparent pr-3 text-[12px] text-[#1e293b] outline-none placeholder:text-[#64748b]"
					/>
				</div>
			</div>

			<!-- Password -->
			<div class="space-y-1.5">
				<div class="flex items-center justify-between gap-4">
					<label
						for="password"
						class="block text-[11px] font-medium text-[#1e293b]"
					>
						Kata Sandi
					</label>

					<button
						type="button"
						class="text-[10px] font-semibold text-[#075985] transition-colors hover:text-[#0284c7] hover:underline"
						title="Fitur pemulihan kata sandi belum tersedia"
					>
						Lupa Sandi?
					</button>
				</div>

				<div
					class="flex h-9.5 items-center border border-[#cbd5e1] bg-[#fbfbff] transition-colors focus-within:border-[#0369a1] focus-within:ring-1 focus-within:ring-[#0369a1]"
				>
					<div class="grid w-10 shrink-0 place-items-center text-[#476582]">
						<LockKeyhole size={17} strokeWidth={1.8} />
					</div>

					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="current-password"
						placeholder="Masukkan kata sandi"
						required
						class="h-full min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[#1e293b] outline-none placeholder:text-[#64748b]"
					/>

					<button
						type="button"
						onclick={() => {
							showPassword = !showPassword;
						}}
						class="grid h-full w-10 shrink-0 place-items-center text-[#476582] transition-colors hover:text-[#075985]"
						aria-label={showPassword
							? 'Sembunyikan kata sandi'
							: 'Tampilkan kata sandi'}
						aria-pressed={showPassword}
					>
						{#if showPassword}
							<EyeOff size={17} strokeWidth={1.8} />
						{:else}
							<Eye size={17} strokeWidth={1.8} />
						{/if}
					</button>
				</div>
			</div>

			<!-- Remember me -->
			<label
				class="flex w-fit cursor-pointer items-center gap-2 text-[11px] text-[#64748b]"
			>
				<input
					type="checkbox"
					bind:checked={rememberMe}
					class="h-3.5 w-3.5 cursor-pointer rounded-xs border-[#cbd5e1] accent-[#075985]"
				/>

				<span>Ingat saya</span>
			</label>

			<!-- Submit -->
			<button
				type="submit"
				disabled={submitting}
				class="mt-1 flex h-10.5 w-full items-center justify-center gap-2 bg-[#075985] px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#064d73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if submitting}
					<LoaderCircle
						size={17}
						strokeWidth={2}
						class="animate-spin"
					/>

					<span>Memproses...</span>
				{:else}
					<span>Masuk</span>
					<ArrowRight size={17} strokeWidth={2.2} />
				{/if}
			</button>
		</form>

		<footer
			class="mt-9 border-t border-[#e2e8f0] pt-5 text-center text-[10px] leading-4 text-[#64748b]"
		>
			<p>Sistem Informasi Manajemen Konten Terpadu</p>
			<p>© {currentYear} Universitas Jember</p>
		</footer>
	</section>
</main>