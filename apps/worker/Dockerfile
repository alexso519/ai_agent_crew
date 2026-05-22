FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY packages/crew-runtime /packages/crew-runtime
RUN pip install --no-cache-dir -e /packages/crew-runtime

COPY apps/worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/src /app/api/src
COPY apps/worker/src /app/worker/src

ENV PYTHONPATH=/app/worker/src:/app/api/src
ENV PYTHONUNBUFFERED=1

CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info", "-Q", "workflow_queue"]
