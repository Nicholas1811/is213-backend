from app import app
from messaging import start_ai_result_consumer

if __name__ == '__main__':
    with app.app_context():
        try:
            start_ai_result_consumer()
        except KeyboardInterrupt:
            print("\n --- Worker stopped by user ---")