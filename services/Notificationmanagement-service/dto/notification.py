class Notification():
    def __init__(self, title, message, notificationType, userId, event_id):
        self.title = title
        self.message = message
        self.notification_type = notificationType
        self.userId = userId
        self.event_id = event_id
    def notification_body(self):
        return {
                    "title" : self.title,
                    "message" : self.message,
                    "notification_type" : self.notification_type,
                    "userId" : self.userId,
                    "event_uuid" : self.event_id
                }



