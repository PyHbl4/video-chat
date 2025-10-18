from __future__ import annotations

import sys
from pathlib import Path


def _ensure_project_root_on_path() -> None:
    tests_dir = Path(__file__).resolve().parent
    project_root = tests_dir.parent
    root_str = str(project_root)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)


_ensure_project_root_on_path()

__all__ = []
