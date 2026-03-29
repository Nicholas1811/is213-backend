FROM python:3.12
WORKDIR /app
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY payment_service.py ./
COPY db_actions ./db_actions

CMD ["uvicorn", "payment_service:app", "--host", "0.0.0.0", "--port", "8080"]
# ENTRYPOINT ["top", "-b"]