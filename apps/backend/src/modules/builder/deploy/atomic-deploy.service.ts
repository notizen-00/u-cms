import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readdir, rename, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AppConfigService } from '../../../config/app-config.service';

const RELEASES_TO_KEEP = 5;

@Injectable()
export class AtomicDeployService {
  private readonly logger = new Logger(AtomicDeployService.name);

  constructor(private readonly config: AppConfigService) {}

  siteDir(slug: string): string {
    // Must be absolute: a relative symlink target resolves relative to the
    // symlink's own directory (not the process cwd), which would otherwise
    // point `current` at a nonexistent nested path.
    return resolve(this.config.buildOutputDir, slug);
  }

  releaseDir(slug: string, buildId: string): string {
    return join(this.siteDir(slug), 'releases', buildId);
  }

  async prepareReleaseDir(slug: string, buildId: string): Promise<string> {
    const dir = this.releaseDir(slug, buildId);
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
  async activate(slug: string, buildId: string): Promise<string> {
    const siteDir = this.siteDir(slug);
    const releaseDir = this.releaseDir(slug, buildId);
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

    await this.pruneOldReleases(slug, buildId);
    return currentPath;
  }

  private async pruneOldReleases(
    slug: string,
    keepBuildId: string,
  ): Promise<void> {
    const releasesDir = join(this.siteDir(slug), 'releases');
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
