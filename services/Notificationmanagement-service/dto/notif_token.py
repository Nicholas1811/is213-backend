class NotificationToken():
    def __init__(self, id, createdAt, device_token, userId):
        self.id = id
        self.createdAt = createdAt
        self.device_token = device_token
        self.userId = userId

    def getId(self):
        return self.id
    def getCreatedAt(self):
        return self.createdAt
    def getDeviceToken(self):
        return self.device_token
    def getUserId(self):
        return self.userId