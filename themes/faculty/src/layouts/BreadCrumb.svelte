{#snippet breadcrumb(items)}
	<section
		class="faculty-page-hero"
		style="
			background-image:
				linear-gradient(
					90deg,
					rgba(7, 30, 24, 0.92) 0%,
					rgba(7, 30, 24, 0.78) 45%,
					rgba(7, 30, 24, 0.48) 100%
				),
				url('https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=80');
		"
	>
		<div class="faculty-page-hero-container">
			<nav class="faculty-breadcrumb" aria-label="Breadcrumb">
				<ol class="faculty-breadcrumb-list">
					{#each items as crumb, index}
						<li class="faculty-breadcrumb-item">
							{#if crumb.href}
								<a
									href={crumb.href}
									class="faculty-breadcrumb-link"
								>
									{#if index === 0}
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-hidden="true"
										>
											<path d="M3 11.5 12 4l9 7.5" />
											<path d="M5.5 10.5V20h13v-9.5" />
										</svg>
									{/if}

									<span>{crumb.label}</span>
								</a>
							{:else}
								<span
									class="faculty-breadcrumb-current"
									aria-current="page"
								>
									{crumb.label}
								</span>
							{/if}

							{#if index < items.length - 1}
								<span
									class="faculty-breadcrumb-separator"
									aria-hidden="true"
								>
									›
								</span>
							{/if}
						</li>
					{/each}
				</ol>
			</nav>

			{#each items.filter((item) => !item.href) as current}
				<h1 class="faculty-page-hero-title">
					{current.label}
				</h1>
			{/each}
		</div>
	</section>
{/snippet}