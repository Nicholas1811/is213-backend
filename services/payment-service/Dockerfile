FROM python:3.12
WORKDIR /app
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY payment_service.py ./
COPY db_actions ./db_actions

CMD ["fastapi", "run", "payment_service.py", "--port", "8081"]

# ENTRYPOINT ["top", "-b"]