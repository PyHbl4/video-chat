#!/usr/bin/env bash
set -euo pipefail

# Basic repo scaffold with Turborepo workspaces (no code, only structure)
echo ">> Initializing repo structure"
mkdir -p apps/web apps/admin apps/api packages/ui packages/shared packages/contracts infra/docker infra/turn infra/nginx docs scripts env

# Root package.json
if [ ! -f package.json ]; then
  cat > package.json <<'JSON'
{
  "name": "self-hosted-videochat",
  "private": true,
  "packageManager": "pnpm@9.6.0",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "turbo run format",
    "gen:contracts": "pnpm -C packages/contracts run gen",
    "docker:dev": "docker compose -f infra/docker/docker-compose.dev.yml up --build"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.6.3",
    "eslint": "^9.11.0",
    "prettier": "^3.3.3"
  }
}
JSON
fi

# Turbo and workspace files
cat > turbo.json <<'JSON'
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV"],
  "pipeline": {
    "dev": { "cache": false, "persistent": true },
    "build": { "cache": true, "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "build/**"] },
    "lint": { "cache": true },
    "typecheck": { "cache": true },
    "format": { "cache": false }
  }
}
JSON

cat > pnpm-workspace.yaml <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
  - "tools/*"
YAML

cat > tsconfig.base.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": []
  }
}
JSON

# Place docs from provided brief if present
if [ -d "__BRIEF__/docs" ]; then
  rsync -a __BRIEF__/docs/ docs/
fi
if [ -d "__BRIEF__/env" ]; then
  rsync -a __BRIEF__/env/ env/
fi

echo ">> Installing root deps with pnpm"
pnpm install

echo ">> Done. Next steps:"
echo "1) Populate apps/ and packages/ according to docs/codex/STAGE-PLAN.md"
echo "2) Copy docker-compose.dev.yml and other infra files from docs or generate them in Stage 0."
