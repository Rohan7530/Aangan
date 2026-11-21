"""In-memory TTL LRU cache with in-flight de-duplication.

Two identical requests arriving together share one computation (one LLM call).
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from typing import Any


class TTLCache:
    def __init__(self, maxsize: int = 1000, ttl: float = 6 * 3600) -> None:
        self.maxsize = maxsize
        self.ttl = ttl
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._inflight: dict[str, asyncio.Task[Any]] = {}

    def get(self, key: str) -> tuple[bool, Any]:
        item = self._data.get(key)
        if item is None:
            return False, None
        expires, value = item
        if expires < time.monotonic():
            del self._data[key]
            return False, None
        self._data.move_to_end(key)
        return True, value

    def set(self, key: str, value: Any, ttl: float | None = None) -> None:
        self._data[key] = (time.monotonic() + (self.ttl if ttl is None else ttl), value)
        self._data.move_to_end(key)
        while len(self._data) > self.maxsize:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()

    def __len__(self) -> int:
        return len(self._data)

    async def get_or_compute(
        self,
        key: str,
        factory: Callable[[], Awaitable[Any]],
        ttl_for: Callable[[Any], float | None] | None = None,
    ) -> tuple[Any, bool]:
        """Return (value, cached). `ttl_for(value)` may shorten the TTL (e.g. for
        degraded answers) or return 0 to skip caching."""
        hit, value = self.get(key)
        if hit:
            return value, True
        task = self._inflight.get(key)
        if task is not None:
            return await asyncio.shield(task), True

        async def run() -> Any:
            try:
                result = await factory()
                ttl = ttl_for(result) if ttl_for else None
                if ttl is None or ttl > 0:
                    self.set(key, result, ttl)
                return result
            finally:
                self._inflight.pop(key, None)

        task = asyncio.ensure_future(run())
        self._inflight[key] = task
        return await asyncio.shield(task), False
