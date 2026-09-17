import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readdir, rename, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AppConfigService } from '../../../config/app-config.service';

const RELEASES_TO_KEEP = 5;

@Injectable()
export class AtomicDeployService {
  private readonly logger = new Logger(AtomicDeployService.name);

  constructor(private readonly config: AppConfigService) {}

  siteDir(): string {
    // One CMS instance publishes one active site. Keeping releases directly
    // below BUILD_OUTPUT_DIR makes nginx independent from a slug/domain lookup.
    return resolve(this.config.buildOutputDir);
  }

  releaseDir(buildId: string): string {
    return join(this.siteDir(), 'releases', buildId);
  }

  async prepareReleaseDir(buildId: string): Promise<string> {
    const dir = this.releaseDir(buildId);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Atomically points `current` at the new release: symlink under a temp name,
   * then rename over `current`. On POSIX (the Docker/Linux deployment target)
   * rename() replaces an existing symlink in one atomic syscall. Windows has
   * no equivalent for directory symlinks and throws EPERM/EEXIST instead, so
   * we fall back to unlink-then-rename there (not atomic, but this path only
   * runs on a Windows host, not in production).
   */
  async activate(buildId: string): Promise<string> {
    const siteDir = this.siteDir();
    const releaseDir = this.releaseDir(buildId);
    const currentPath = join(siteDir, 'current');
    const tmpLinkPath = join(siteDir, `current.tmp-${buildId}`);

    await symlink(releaseDir, tmpLinkPath, 'dir');

    try {
      await rename(tmpLinkPath, currentPath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'EEXIST') {
        await rm(tmpLinkPath, { force: true });
        throw error;
      }
      await rm(currentPath, { force: true });
      await rename(tmpLinkPath, currentPath);
    }

    await this.pruneOldReleases(buildId);
    return currentPath;
  }

  private async pruneOldReleases(
    keepBuildId: string,
  ): Promise<void> {
    const releasesDir = join(this.siteDir(), 'releases');
    let entries: string[];
    try {
      entries = await readdir(releasesDir);
    } catch {
      return;
    }

    const stale = entries.filter((name) => name !== keepBuildId).sort();
    const toDelete = stale.slice(
      0,
      Math.max(0, stale.length - (RELEASES_TO_KEEP - 1)),
    );

    await Promise.all(
      toDelete.map(async (name) => {
        try {
          await rm(join(releasesDir, name), { recursive: true, force: true });
        } catch (error) {
          this.logger.warn(
            `Failed to prune old release ${name}: ${String(error)}`,
          );
        }
      }),
    );
  }
}
