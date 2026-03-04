FROM python:3.12
WORKDIR /app
COPY app.py ./

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "points_service.py"]
