<script lang="ts">
	import { page } from '$app/state';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { AuthUser, Site } from '$lib/types';
	import SiteSwitcher from './SiteSwitcher.svelte';

	import Bell from '@lucide/svelte/icons/bell';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Menu from '@lucide/svelte/icons/menu';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';

	let {
		user,
		sites,
		activeSite,
		onMenuToggle = () => {}
	}: {
		user: AuthUser;
		sites: Site[];
		activeSite: Site | null;
		onMenuToggle?: () => void;
	} = $props();

	const pathname = $derived(page.url.pathname);

	const publishHref = $derived(
		activeSite ? `/sites/${activeSite.id}/news/new` : '/sites/new'
	);

	const settingsHref = $derived(
		activeSite ? `/sites/${activeSite.id}/edit` : '/account/sessions'
	);

	const initials = $derived(
		user.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || 'U'
	);
</script>

<header
	class="flex h-16 shrink-0 items-center border-b border-[#e1e7ef] bg-white px-3 sm:px-4 lg:px-5"
>
	<div class="flex min-w-0 flex-1 items-center gap-3">
		<button
			type="button"
			class="grid h-9 w-9 shrink-0 place-items-center text-[#47627d] hover:bg-[#f1f5f9] lg:hidden"
			aria-label="Buka navigasi"
			onclick={onMenuToggle}
		>
			<Menu size={20} />
		</button>

		<SiteSwitcher {sites} {activeSite} />
	</div>

	<nav class="hidden h-full items-center gap-5 md:flex">
		<a
			href="/"
			class={[
				'flex h-full items-center border-b-2 px-1 text-[12px] font-semibold transition-colors',
				pathname === '/'
					? 'border-[#075985] text-[#075985]'
					: 'border-transparent text-[#64748b] hover:text-[#075985]'
			]}
		>
			Dashboard
		</a>

		<button
			type="button"
			class="text-[11px] font-medium text-[#64748b] transition-colors hover:text-[#075985]"
			title="Pusat bantuan belum tersedia"
		>
			Bantuan
		</button>
	</nav>

	<div class="ml-3 flex flex-1 items-center justify-end gap-1 sm:gap-2">
		<a
			href={publishHref}
			class="hidden h-9 items-center justify-center gap-1.5 bg-[#075985] px-4 text-[11px] font-semibold text-white transition-colors hover:bg-[#064c72] sm:flex"
		>
			<Plus size={14} strokeWidth={2.2} />
			<span>Terbitkan</span>
		</a>

		<button
			type="button"
			class="relative grid h-9 w-9 place-items-center text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#075985]"
			aria-label="Notifikasi"
			title="Notifikasi belum tersedia"
		>
			<Bell size={17} strokeWidth={1.8} />

			<span
				class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#075985]"
				aria-hidden="true"
			></span>
		</button>

		<a
			href={settingsHref}
			class="grid h-9 w-9 place-items-center text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#075985]"
			aria-label="Pengaturan"
		>
			<Settings size={17} strokeWidth={1.8} />
		</a>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						type="button"
						class="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#cbd5e1] bg-[#e8f0f8] text-[10px] font-bold text-[#075985] transition-shadow hover:ring-2 hover:ring-[#075985]/20"
						aria-label="Buka menu akun"
						{...props}
					>
						{initials}
					</button>
				{/snippet}
			</DropdownMenu.Trigger>

			<DropdownMenu.Content class="w-64">
				<DropdownMenu.Group>
					<DropdownMenu.Label>
						<div class="flex flex-col gap-0.5">
							<span class="truncate font-semibold text-foreground">
								{user.name}
							</span>

							<span class="truncate text-xs font-normal text-muted-foreground">
								{user.email}
							</span>
						</div>
					</DropdownMenu.Label>
				</DropdownMenu.Group>

				<DropdownMenu.Separator />

				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a
							href="/account/sessions"
							class="flex w-full items-center gap-2"
							{...props}
						>
							<KeyRound size={15} />
							<span>Sesi saya</span>
						</a>
					{/snippet}
				</DropdownMenu.Item>

				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a
							href={settingsHref}
							class="flex w-full items-center gap-2"
							{...props}
						>
							<Settings size={15} />
							<span>Pengaturan</span>
						</a>
					{/snippet}
				</DropdownMenu.Item>

				<DropdownMenu.Separator />

				<DropdownMenu.Item>
					{#snippet child({ props })}
						<form method="POST" action="/logout" class="w-full">
							<button
								type="submit"
								class="flex w-full items-center gap-2 text-left text-red-600"
								{...props}
							>
								<LogOut size={15} />
								<span>Keluar</span>
							</button>
						</form>
					{/snippet}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>