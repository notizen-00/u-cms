import type { BaseManifest, ManifestDependency } from "./manifest.js";
import { parseSemVer } from "./version.js";
import type { ValidationIssue } from "./types.js";

export function validateBaseManifest(manifest: BaseManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const requireNonEmpty = (path: string, value: string | undefined) => {
    if (!value || value.trim().length === 0) {
      issues.push({ path, message: `"${path}" is required` });
    }
  };

  requireNonEmpty("id", manifest.id);
  requireNonEmpty("name", manifest.name);
  requireNonEmpty("description", manifest.description);
  requireNonEmpty("license", manifest.license);
  requireNonEmpty("author.name", manifest.author?.name);

  if (!manifest.version) {
    issues.push({ path: "version", message: '"version" is required' });
  } else if (!parseSemVer(manifest.version).ok) {
    issues.push({ path: "version", message: `"${manifest.version}" is not a valid SemVer string` });
  }

  if (!manifest.compatibility) {
    issues.push({ path: "compatibility", message: '"compatibility" is required' });
  } else {
    for (const hostKey of ["cms", "sdk"] as const) {
      const range = manifest.compatibility[hostKey];
      if (!range) {
        issues.push({
          path: `compatibility.${hostKey}`,
          message: `"compatibility.${hostKey}" is required`,
        });
        continue;
      }
      for (const boundKey of ["min", "max"] as const) {
        const bound = range[boundKey];
        if (bound !== undefined && !parseSemVer(bound).ok) {
          issues.push({
            path: `compatibility.${hostKey}.${boundKey}`,
            message: `"${bound}" is not a valid SemVer string`,
          });
        }
      }
    }
  }

  (manifest.dependencies ?? []).forEach((dependency, index) => {
    issues.push(...validateManifestDependency(dependency, `dependencies[${index}]`));
  });

  return issues;
}

function validateManifestDependency(
  dependency: ManifestDependency,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!dependency.id || dependency.id.trim().length === 0) {
    issues.push({ path: `${path}.id`, message: '"id" is required' });
  }
  for (const boundKey of ["min", "max"] as const) {
    const bound = dependency.range?.[boundKey];
    if (bound !== undefined && !parseSemVer(bound).ok) {
      issues.push({
        path: `${path}.range.${boundKey}`,
        message: `"${bound}" is not a valid SemVer string`,
      });
    }
  }
  return issues;
}

/**
 * Checks that every capability an extension *declares in its manifest* is
 * contained in the set the host actually grants. Used before activation so
 * a plugin can never silently use an ungranted capability.
 */
export function validateCapabilities(
  declared: readonly string[],
  granted: ReadonlySet<string>,
): ValidationIssue[] {
  return declared
    .filter((capability) => !granted.has(capability))
    .map((capability) => ({
      path: `capabilities`,
      message: `capability "${capability}" was declared but not granted by the host`,
    }));
}

/**
 * Resolves each declared dependency against an installed-version lookup.
 * `resolveInstalledVersion` returning `undefined` means "not installed".
 */
export function validateDependencies(
  dependencies: readonly ManifestDependency[],
  resolveInstalledVersion: (id: string) => string | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const dependency of dependencies) {
    const installedVersion = resolveInstalledVersion(dependency.id);
    if (!installedVersion) {
      if (!dependency.optional) {
        issues.push({
          path: `dependencies.${dependency.id}`,
          message: `required dependency "${dependency.id}" is not installed`,
        });
      }
      continue;
    }

    const installed = parseSemVer(installedVersion);
    if (!installed.ok) {
      issues.push({
        path: `dependencies.${dependency.id}`,
        message: `installed version "${installedVersion}" of "${dependency.id}" is not valid SemVer`,
      });
      continue;
    }

    const min = dependency.range.min ? parseSemVer(dependency.range.min) : undefined;
    const max = dependency.range.max ? parseSemVer(dependency.range.max) : undefined;
    const tooLow = min?.ok && compareBound(installed.value, min.value) < 0;
    const tooHigh = max?.ok && compareBound(installed.value, max.value) > 0;

    if (tooLow || tooHigh) {
      issues.push({
        path: `dependencies.${dependency.id}`,
        message: `installed version "${installedVersion}" of "${dependency.id}" does not satisfy range [${dependency.range.min ?? "*"}, ${dependency.range.max ?? "*"}]`,
      });
    }
  }

  return issues;
}

function compareBound(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number },
): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}
