import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

import redis

from core.config import settings

logger = logging.getLogger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
        logger.info(
            "%s %s %s %.2fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple Redis sliding-window rate limit per client IP."""

    _redis: redis.Redis | None = None

    def _client(self) -> redis.Redis:
        if RateLimitMiddleware._redis is None:
            RateLimitMiddleware._redis = redis.from_url(
                settings.redis_url,
                decode_responses=True,
            )
        return RateLimitMiddleware._redis

    async def dispatch(self, request: Request, call_next) -> Response:
        limit = settings.rate_limit_per_minute
        window = 60
        if limit <= 0 or request.url.path in ("/health", "/health/live", "/health/ready"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}:{int(time.time()) // window}"
        try:
            count = self._client().incr(key)
            if count == 1:
                self._client().expire(key, window)
            if count > limit:
                return Response(
                    content='{"detail":"Rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                )
        except redis.RedisError:
            logger.warning("Rate limiter unavailable — allowing request")

        return await call_next(request)
