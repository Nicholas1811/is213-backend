FROM python:3.12
WORKDIR /app
COPY notification_management.py ./
COPY requirements.txt ./
COPY consumer.py ./

COPY dto ./dto

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "consumer.py"]
