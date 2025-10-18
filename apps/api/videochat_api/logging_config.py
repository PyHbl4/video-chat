from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

_LOG_FILE_NAME = "videochat_api.log"
# 10 MiB с пятью резервными файлами позволяют хранить журналы нескольких дней работы
# при умеренном объёме трафика (API + Socket.IO).
_MAX_LOG_FILE_BYTES = 10 * 1024 * 1024
_BACKUP_COUNT = 5


def _build_handler(log_path: Path) -> RotatingFileHandler:
    handler = RotatingFileHandler(
        log_path,
        maxBytes=_MAX_LOG_FILE_BYTES,
        backupCount=_BACKUP_COUNT,
        encoding="utf-8",
    )
    handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    handler.setLevel(logging.INFO)
    return handler


def _get_handler(logger: logging.Logger, target_path: str) -> RotatingFileHandler | None:
    for handler in logger.handlers:
        if isinstance(handler, RotatingFileHandler) and getattr(
            handler, "baseFilename", None
        ) == target_path:
            return handler
    return None


def configure_logging() -> None:
    """Configure rotating file logging for the whole application."""

    project_root = Path(__file__).resolve().parent.parent
    log_path = project_root / _LOG_FILE_NAME
    target_path = str(log_path)

    root_logger = logging.getLogger()
    uvicorn_error_logger = logging.getLogger("uvicorn.error")
    uvicorn_access_logger = logging.getLogger("uvicorn.access")

    handler = _get_handler(root_logger, target_path)
    if handler is None:
        handler = _build_handler(log_path)
        root_logger.addHandler(handler)
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        )
        handler.setLevel(logging.INFO)

    root_logger.setLevel(logging.INFO)

    for logger in (uvicorn_error_logger, uvicorn_access_logger):
        if _get_handler(logger, target_path) is None:
            logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = True