#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
OPENAPI_FILE="$ROOT_DIR/openapi.yaml"
OUTPUT_FILE="$ROOT_DIR/dist/models.py"

if [[ ! -f "$OPENAPI_FILE" ]]; then
  echo "OpenAPI specification not found at $OPENAPI_FILE" >&2
  exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --upgrade pip >/dev/null
fi

if ! "$VENV_DIR/bin/python" -m datamodel_code_generator --version >/dev/null 2>&1; then
  "$VENV_DIR/bin/pip" install datamodel-code-generator >/dev/null
fi

mkdir -p "$ROOT_DIR/dist"
"$VENV_DIR/bin/datamodel-codegen" \
  --input "$OPENAPI_FILE" \
  --input-file-type openapi \
  --output "$OUTPUT_FILE"
