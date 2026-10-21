#!/bin/bash

# Look for the version string with additional handling for:
# - Abitrary Spaces: ` *`
# - Extracting the version into a match group: `(...)`
# - Substituting the matched string with the match group: `/\1/`
export packageVersion=$( echo $(cat package.json | jq .version) | sed -n 's/^["]\([0-9\.]*\).*/\1/p' )
export packageVersionXy=$( echo $(cat package.json | jq .version) | sed -n 's/^["]\([0-9]*\.[0-9]*\).*/\1/p' )
export packageLockVersion=$( echo $(cat package-lock.json | jq .version) | sed -n 's/["]\([0-9\.]*\).*/\1/p' )
export packageLockVersionXy=$( echo $(cat package-lock.json | jq .version) | sed -n 's/["]\([0-9]*\.[0-9]*\).*/\1/p' )

# --- Shared version-hook contract (supertokens/actions release-tag.yml) ---
# The reusable release pipeline sources this script and reads constantsVersion /
# constantsVersionXy. Repo-specific setup checks also belong here and exit
# non-zero to fail the pipeline's setup job.

# node keeps package.json and package-lock.json versions in lockstep; a
# mismatch means a botched bump, so refuse to tag/release. (Previously enforced
# inline in the "Check tag and branch correctness" step of the release and
# check-docs workflows.)
if [[ "$packageVersion" != "$packageLockVersion" ]]; then
    echo "The package version and package lock version do not match." >&2
    exit 1
fi

# For node the released version IS the package version.
export constantsVersion="$packageVersion"
export constantsVersionXy="$packageVersionXy"

export newestVersion=$( if [[ "$packageVersion" > "$packageLockVersion" ]]; then echo "$packageVersion"; else echo "$packageLockVersion"; fi )

# Target branch of the PR.
# Ideally, this is all we want to check.
if [[ "$GITHUB_BASE_REF" != "" ]]
then
    export targetBranch="$GITHUB_BASE_REF"
else # Fallback to current branch if not in a PR
    export targetBranch=$(git branch --show-current 2> /dev/null) || export targetBranch="(unnamed branch)" # Get current branch
fi
export targetBranch=${targetBranch##refs/heads/}  # Remove refs/heads/ if present
