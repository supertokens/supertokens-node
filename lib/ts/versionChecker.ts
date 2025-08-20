const parseVersion = (version: string): { major: number; minor: number; patch: number; prerelease?: string } => {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
        throw new Error(`Invalid version format: ${version}`);
    }

    return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3]),
        prerelease: match[4],
    };
};

const compareVersions = (a: ReturnType<typeof parseVersion>, b: ReturnType<typeof parseVersion>): number => {
    if (a.major !== b.major) {
        return a.major - b.major;
    }
    if (a.minor !== b.minor) {
        return a.minor - b.minor;
    }
    if (a.patch !== b.patch) {
        return a.patch - b.patch;
    }

    // canary versions
    if (a.prerelease && !b.prerelease) {
        return -1;
    }
    if (!a.prerelease && b.prerelease) {
        return 1;
    }
    if (a.prerelease && b.prerelease) {
        return a.prerelease.localeCompare(b.prerelease);
    }

    return 0;
};

// checks if a version satisfies a range constraint. supports: ">=0.49.0", "0.49.x", "~0.49.0", "^0.49.0", "0.49.1"
const satisfiesRange = (version: string, range: string): boolean => {
    const parsedVersion = parseVersion(version);

    if (range === version) {
        return true;
    }

    const rangeMatch = range.match(/^([<>=~^]+)\s*(.+)$/);
    if (rangeMatch) {
        const operator = rangeMatch[1];
        const rangeVersion = rangeMatch[2];
        const parsedRangeVersion = parseVersion(rangeVersion);
        const comparison = compareVersions(parsedVersion, parsedRangeVersion);

        switch (operator) {
            case ">=":
                return comparison >= 0;
            case ">":
                return comparison > 0;
            case "<=":
                return comparison <= 0;
            case "<":
                return comparison < 0;
            case "=":
            case "==":
                return comparison === 0;
            case "~":
                return (
                    parsedVersion.major === parsedRangeVersion.major &&
                    parsedVersion.minor === parsedRangeVersion.minor &&
                    parsedVersion.patch >= parsedRangeVersion.patch
                );
            case "^":
                if (parsedRangeVersion.major === 0) {
                    return (
                        parsedVersion.major === 0 &&
                        parsedVersion.minor === parsedRangeVersion.minor &&
                        parsedVersion.patch >= parsedRangeVersion.patch
                    );
                } else {
                    return (
                        parsedVersion.major === parsedRangeVersion.major &&
                        parsedVersion.minor >= parsedRangeVersion.minor
                    );
                }
            default:
                return false;
        }
    }

    // x-ranges like "0.49.x"
    const xRangeMatch = range.match(/^(\d+)\.(\d+)\.x$/);
    if (xRangeMatch) {
        return (
            parsedVersion.major === parseInt(xRangeMatch[1], 10) && parsedVersion.minor === parseInt(xRangeMatch[2], 10)
        );
    }

    // wildcard ranges like "0.x"
    const wildcardMatch = range.match(/^(\d+)\.x$/);
    if (wildcardMatch) {
        return parsedVersion.major === parseInt(wildcardMatch[1], 10);
    }

    const exactRangeVersion = parseVersion(range);
    return compareVersions(parsedVersion, exactRangeVersion) === 0;
};

export const isVersionCompatible = (currentVersion: string, constraints: string | string[]): boolean => {
    const constraintArray = Array.isArray(constraints) ? constraints : [constraints];

    for (const constraint of constraintArray) {
        if (satisfiesRange(currentVersion, constraint)) {
            return true;
        }
    }

    return false;
};
