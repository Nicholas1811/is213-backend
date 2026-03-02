class Header():
    def __init__(self, auth_result, content_type):
        self.auth_result = auth_result
        self.content_type = content_type

    def showHeader(self):
        return {
            "Authorization" : f"Bearer {self.auth_result}",
            "Content-Type": f"{self.content_type}",
        }