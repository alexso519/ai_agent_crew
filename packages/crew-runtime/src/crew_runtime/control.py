from typing import Literal

import redis

ControlSignal = Literal["pause", "resume", "kill"]


class ExecutionControl:
    """Redis-backed execution control plane for pause / resume / kill."""

    def __init__(self, redis_url: str, execution_id: str) -> None:
        self._client = redis.from_url(redis_url, decode_responses=True)
        self._key = f"execution:{execution_id}:control"

    def get_signal(self) -> ControlSignal | None:
        value = self._client.get(self._key)
        if value in ("pause", "resume", "kill"):
            return value  # type: ignore[return-value]
        return None

    def set_signal(self, signal: ControlSignal) -> None:
        self._client.set(self._key, signal, ex=86400)

    def clear_signal(self) -> None:
        self._client.delete(self._key)

    def is_killed(self) -> bool:
        return self.get_signal() == "kill"

    def is_paused(self) -> bool:
        return self.get_signal() == "pause"

    def wait_if_paused(self, poll_seconds: float = 1.0) -> bool:
        """Block while paused. Returns False if killed."""
        import time

        while self.is_paused():
            if self.is_killed():
                return False
            time.sleep(poll_seconds)
        return not self.is_killed()
