from app.clients.rabbitmq_client import RabbitMQClient
from app.messaging import publisher


class Consumer:
    def __init__(self, rabbitmq_client: RabbitMQClient, publisher: publisher) -> None:
        return
