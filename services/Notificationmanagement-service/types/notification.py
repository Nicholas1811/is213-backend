class Notification():
    def __init__(self, title, message, notificationType, userId):
        self.title = title
        self.message = message
        self.notification_type = notificationType
        self.userId = userId
    def notification_body(self):
        return{
            "title" : self.title,
            "message" : self.message,
            "notficiation_type" : self.notification_type,
            "userId" : self.userId
        }