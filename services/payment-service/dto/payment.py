class Payment():
    def __init__(self, listingId: int, user_id: int, quantity: int, created: str):
        self.listingId = listingId
        self.user_id = user_id
        self.quantity = quantity
        self.created = created
    def payment_body(self):
        return {
            "listingId": self.listingId,
            "user_id": self.user_id,
            "quantity": self.quantity,
            "created": self.created
        }