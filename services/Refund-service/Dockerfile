FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8080
CMD ["python", "controller/refund_controller.py"]
# ENTRYPOINT ["top", "-b"]