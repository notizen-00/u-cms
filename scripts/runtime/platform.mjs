/**
 * Platform/arch detection for the portable runtime.
 *
 * Every service manifest (postgres/redis/minio) maps FROM this canonical key
 * TO its own upstream asset naming — so this file is the one place that knows
 * what Node calls a platform, and nowhere else needs process.platform checks.
 */

export const SUPPORTED_TARGETS = ['win32-x64', 'linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64'];

export class UnsupportedPlatformError extends Error {
	constructor(platform, arch) {
		super(
			`Unsupported platform: ${platform}-${arch}\n\n` +
				`Supported:\n${SUPPORTED_TARGETS.map((target) => `  - ${target}`).join('\n')}`
		);
		this.name = 'UnsupportedPlatformError';
		this.platform = platform;
		this.arch = arch;
	}
}

/** @returns {{ platform: NodeJS.Platform, arch: string, target: string }} */
export function detectPlatform() {
	const platform = process.platform;
	const arch = process.arch;
	const target = `${platform}-${arch}`;
	if (!SUPPORTED_TARGETS.includes(target)) throw new UnsupportedPlatformError(platform, arch);
	return { platform, arch, target };
}

export function isWindows() {
	return process.platform === 'win32';
}
