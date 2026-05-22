import json
from typing import Any
from uuid import UUID

import redis

from core.config import settings
from crew_runtime.callbacks import ExecutionEvent


class RedisEventBus:
    def __init__(self, redis_url: str | None = None) -> None:
        self._url = redis_url or settings.redis_url
        self._client: redis.Redis | None = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(self._url, decode_responses=True)
        return self._client

    def channel(self, execution_id: str | UUID) -> str:
        return f"execution:{execution_id}:events"

    def control_key(self, execution_id: str | UUID) -> str:
        return f"execution:{execution_id}:control"

    def publish_event(self, event: ExecutionEvent) -> None:
        payload = json.dumps(event.to_dict())
        self.client.publish(self.channel(event.execution_id), payload)

    def publish_dict(self, execution_id: str | UUID, data: dict[str, Any]) -> None:
        self.client.publish(self.channel(execution_id), json.dumps(data))

    def set_control(self, execution_id: str | UUID, signal: str) -> None:
        self.client.set(self.control_key(execution_id), signal, ex=86400)

    def pubsub(self, execution_id: str | UUID):
        pubsub = self.client.pubsub()
        pubsub.subscribe(self.channel(execution_id))
        return pubsub


event_bus = RedisEventBus()
