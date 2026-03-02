from doctest import debug
from hmac import new
from http.client import responses
from idlelib.pyshell import UserInputTaggingDelegator
from pyexpat.errors import messages
from socket import fromfd

from fastapi import FastAPI
import requests
import json
from dto.notif_token import NotificationToken
from dto.header import Header
from dto.notification import Notification
import os
from dotenv import load_dotenv

app = FastAPI()

## this thing does a push to the DB

load_dotenv()

## Making workflow boundaries clear.
def lambdaAuthenticate():
    authentication_result = requests.post("https://vxyrvhbczwwjsytja4riojwe6u0ffwwa.lambda-url.ap-southeast-1.on.aws/").json()
    if(authentication_result!= None):
        return authentication_result['access_token']
    return None

def getCurrentUserTokens(userId):
    user_tokens = requests.get(f"https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens/{userId}")
    user_tokens.raise_for_status()
    data = user_tokens.json()
    result = [
        NotificationToken(
            item['Id'], item['createdAt'], item['device_token'], item['userId']
        )
        for item in data
    ]
    return result

## Making the payload for each notification.
def payloadConstruction(device_token):
    authentication_result = lambdaAuthenticate()
    if(authentication_result != None):
        fcm_url = f"https://fcm.googleapis.com/v1/projects/notification-is213/messages:send" #boleh hardcode, no worries.
        content_type = "application/json; UTF-8"
        headers = Header(authentication_result, content_type).showHeader()

        payload = {
            "message": {
            ## this is the device registration token you should get from the client app.
            ## this is the authentication between the FCM and the client (authenticate client with FCM)
            ## temp keys, we will be tying our users to this.
                ## TODO, get current user's tokens.
                "token": f"{device_token}",
                "notification": {
                    "title": "Hello 👋",
                    "body": "This is a test notification from Python",
                },
                "data": {
                    "type": "binding.key",
                }
            }
        }
        return {
            "headers" : headers,
            "payload" : payload,
            "fcm_url" : fcm_url
        }
    return None

## Pushed to the DB
def addToNotifications(event):
    notification = Notification( event['title'], event['message'], event['key'], event['userId']).notification_body()
    result = requests.post("https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens", data= notification)
    pass

## The main push.
def pushNotificationWorkflow(event):
    user_tokens = getCurrentUserTokens(event['userId'])
    for token_obj in user_tokens:
        information = payloadConstruction(token_obj.getDeviceToken())
        response = requests.post(information['fcm_url'], headers=information['headers'], data=json.dumps(information['payload']))
        print(response.status_code, response.text)
    addToNotifications(event)






