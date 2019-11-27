# Hooks

## Pre-commit hooks

### Installation
```bash
npm run set-up-hooks
```

### What it does
- Stashes un-added and untracked changes
- Checks for TS compilation errors
- Checks for formatting issues in .js and .ts files
- Unstashes the stashed contents if any and drop the stash
- If there are no errors, then proceeds to commit
