FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml

RUN pip install --no-cache-dir .

COPY app /app/app
COPY tests /app/tests

CMD ["python", "-m", "app.main"]

