FROM python:3.12
WORKDIR /app
COPY mock_producer.py ./
COPY app.py ./
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]
