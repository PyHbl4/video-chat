from __future__ import annotations

import asyncio
import inspect
from typing import Any

import pytest


@pytest.fixture(scope="session")
def event_loop() -> asyncio.AbstractEventLoop:
    loop = asyncio.new_event_loop()
    try:
        yield loop
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line("markers", "asyncio: run test in asyncio event loop")


@pytest.hookimpl(tryfirst=True)
def pytest_fixture_setup(fixturedef: pytest.FixtureDef[Any], request: pytest.FixtureRequest):
    func = fixturedef.func
    if inspect.isasyncgenfunction(func):
        loop = request.getfixturevalue("event_loop")
        kwargs = {
            name: request._get_active_fixturedef(name).execute(request)
            for name in fixturedef.argnames
        }
        agen = func(**kwargs)
        value = loop.run_until_complete(agen.__anext__())
        fixturedef.cached_result = (value, fixturedef.cache_key(request), None)

        def _finalizer() -> None:
            loop.run_until_complete(agen.aclose())

        request.addfinalizer(_finalizer)
        return value

    if inspect.iscoroutinefunction(func):
        loop = request.getfixturevalue("event_loop")
        kwargs = {
            name: request._get_active_fixturedef(name).execute(request)
            for name in fixturedef.argnames
        }
        value = loop.run_until_complete(func(**kwargs))
        fixturedef.cached_result = (value, fixturedef.cache_key(request), None)
        return value

    return None


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool:
    test_fn = pyfuncitem.obj
    if inspect.iscoroutinefunction(test_fn):
        loop = pyfuncitem._request.getfixturevalue("event_loop")  # type: ignore[attr-defined]
        kwargs = {name: pyfuncitem.funcargs[name] for name in pyfuncitem._fixtureinfo.argnames}  # type: ignore[attr-defined]
        loop.run_until_complete(test_fn(**kwargs))
        return True
    return False
