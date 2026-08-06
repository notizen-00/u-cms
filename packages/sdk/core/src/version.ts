import { err, ok, type Result } from "./types.js";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: string | null;
  readonly raw: string;
}

export function parseSemVer(input: string): Result<SemVer> {
  const match = SEMVER_PATTERN.exec(input.trim());
  if (!match) {
    return err([{ path: "version", message: `"${input}" is not a valid SemVer string` }]);
  }
  const [, major, minor, patch, prerelease] = match;
  return ok({
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ?? null,
    raw: input,
  });
}

/** Returns -1, 0 or 1, matching `Array#sort` comparator semantics. */
export function compareSemVer(a: SemVer, b: SemVer): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  if (a.prerelease === b.prerelease) return 0;
  // No prerelease outranks any prerelease (1.0.0 > 1.0.0-beta.1).
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0;
}

export function isSemVerInRange(
  version: SemVer,
  min?: SemVer,
  max?: SemVer,
): boolean {
  if (min && compareSemVer(version, min) < 0) return false;
  if (max && compareSemVer(version, max) > 0) return false;
  return true;
}

/**
 * Compatibility window a plugin/theme declares against a host (CMS or SDK).
 * `undefined` bounds mean "no floor" / "no ceiling".
 */
export interface CompatibilityRange {
  readonly min?: string;
  readonly max?: string;
}

export interface CompatibilityCheckResult {
  readonly compatible: boolean;
  readonly reason?: string;
}

export function checkCompatibility(
  label: string,
  hostVersion: string,
  range: CompatibilityRange,
): CompatibilityCheckResult {
  const hostResult = parseSemVer(hostVersion);
  if (!hostResult.ok) {
    return { compatible: false, reason: `Invalid ${label} host version "${hostVersion}"` };
  }

  const minResult = range.min ? parseSemVer(range.min) : undefined;
  if (minResult && !minResult.ok) {
    return { compatible: false, reason: `Invalid ${label} minimum version "${range.min}"` };
  }

  const maxResult = range.max ? parseSemVer(range.max) : undefined;
  if (maxResult && !maxResult.ok) {
    return { compatible: false, reason: `Invalid ${label} maximum version "${range.max}"` };
  }

  const inRange = isSemVerInRange(
    hostResult.value,
    minResult?.ok ? minResult.value : undefined,
    maxResult?.ok ? maxResult.value : undefined,
  );

  if (!inRange) {
    return {
      compatible: false,
      reason: `${label} ${hostVersion} is outside declared range [${range.min ?? "*"}, ${range.max ?? "*"}]`,
    };
  }

  return { compatible: true };
}
