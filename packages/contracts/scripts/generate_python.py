#!/usr/bin/env python3
"""Generate Python typings/client stubs from OpenAPI."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parent.parent
OPENAPI_PATH = ROOT / "openapi.yaml"
OUTPUT_DIR = ROOT / "generated" / "python"


def _write_placeholder() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    client_file = OUTPUT_DIR / "client.py"
    client_file.write_text(
        dedent(
            f"""
            """Auto-generated placeholder.
            Replace with real client using `openapi-python-client` once the schema stabilises.
            """

            from __future__ import annotations


            class ApiClient:
                """Minimal stand-in client for development bootstrap."""

                base_url: str = "http://localhost:8000"

                def health(self) -> dict[str, str]:
                    """Return a static health payload."""

                    return {{"status": "ok"}}

                def version(self) -> dict[str, str]:
                    """Return a static version payload."""

                    return {{
                        "name": "Self-Hosted Video Chat API",
                        "version": "0.0.1",
                        "environment": "development",
                    }}
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )
    (OUTPUT_DIR / "__init__.py").write_text("from .client import ApiClient\n__all__ = ['ApiClient']\n", encoding="utf-8")
    print("WARNING: openapi-python-client not found; wrote placeholder stubs instead.")


def main() -> int:
    executable = shutil.which("openapi-python-client")

    if executable is None:
        _write_placeholder()
        return 0

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        subprocess.run(
            [
                executable,
                "generate",
                "--path",
                str(OPENAPI_PATH),
                "--output",
                str(OUTPUT_DIR),
                "--meta",
                "none",
            ],
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        print(
            "openapi-python-client failed (" f"{exc}" ") — falling back to placeholder stubs.",
            file=sys.stderr,
        )
        _write_placeholder()
        return 0

    print(f"Generated Python client into {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
