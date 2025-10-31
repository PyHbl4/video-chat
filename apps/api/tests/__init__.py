from __future__ import annotations

import sys
from pathlib import Path



# Функция проверки нахождения корневой директории проекта в sys.path.
def _ensure_project_root_on_path() -> None:
    # Получаем путь к текущему файлу.
    tests_dir = Path(__file__).resolve().parent

    # Получаем родительскую директорию.
    project_root = tests_dir.parent

    # Добавляем корневую директорию в sys.path и преобразует в строку.
    root_str = str(project_root)

    # Проверяем, есть ли корневая директория в sys.path.
    if root_str not in sys.path:
        # Если нет - добавляем корневую директорию в начало sys.path.
        sys.path.insert(0, root_str)


# Вызываем функцию для проверки (один раз при импорте пакета).
_ensure_project_root_on_path()


__all__ = []
