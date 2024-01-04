#!/bin/bash

# Get TypeScript version inside test/with-typescript
version=$(npx tsc --version | cut -d' ' -f2)

# ANSI color codes
RED='\033[0;31m'
NC='\033[0m' # No Color

# Compare major version
if [ "$(echo $version | cut -d'.' -f1)" -ge 5 ]; then
    npx tsc -p tsconfig.json --noEmit
else
    echo -e "${RED}TypeScript version is less than 5. Please run 'npm install' inside 'test/with-typescript'.${NC}"
    exit 1
fi
