FROM python:3.12
WORKDIR /app
COPY notification_management.py ./
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

CMD ["uvicorn", "notification_poc:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]