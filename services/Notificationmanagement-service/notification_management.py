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

# Authentication for lambda.
def lambdaAuthenticate():
    authentication_result = requests.post("https://vxyrvhbczwwjsytja4riojwe6u0ffwwa.lambda-url.ap-southeast-1.on.aws/").json()
    if(authentication_result!= None):
        return authentication_result['access_token']
    return None

# current user tokens
def getCurrentUserTokens(userId):
    user_tokens = requests.get(f"https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens/{userId}")
    user_tokens.raise_for_status()
    data = user_tokens.json()
    result = [NotificationToken(item['Id'], item['createdAt'], item['device_token'], item['userId'])for item in data]
    return result

## Making the payload for each notification.
def payloadConstruction(device_token, event):
    authentication_result = lambdaAuthenticate()
    if(authentication_result != None):
        fcm_url = f"https://fcm.googleapis.com/v1/projects/notification-is213/messages:send" #boleh hardcode, no worries.
        content_type = "application/json; UTF-8"
        headers = Header(authentication_result, content_type).showHeader()

        payload = {
            "message": {
                ## TODO, get current user's tokens.
                "token": f"{device_token}",
                "notification": {
                    **event_dictionary(event)
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
def addToNotifications(event, payloadInfo):
    notification = Notification(
        payloadInfo['payload']['message']['notification']['title'],
        payloadInfo['payload']['message']['notification']['body'],
        event['key'],
        event['userId'],
        event['event_id']
    ).notification_body()
    print("Payload being sent:", flush=True)
    print(json.dumps(notification, indent=2), flush=True)
    print(type(notification), flush=True)
    result = requests.post("https://personal-fsn5aajc.outsystemscloud.com/NotificationService/rest/Notifications/notifications", json=notification)
    print("===START OF RESULT===")
    print(result, flush=True)
    print("===END OF RESULT===")

## The main push.
def event_dictionary(event):
    eventKey = event['key']
    sample_dict = {
        "order.created" : {
            "title" : "Order created",
            "body" : f"Your order has been created. The order id is {event['event_original_id']}"
        },
        "order.success" : {
            "title" : "Order Success",
            "body" : f"Your order has been successfully processed. The order id is {event['event_original_id']}"
        },
        "order.failure" : {
            "title" : "Order failure",
            "body" : f"Your order has failed. The order id is {event['event_original_id']}"
        },
        "point.created" : {
            "title" : "Point created",
            "body" : f"Your point request has been created. The point tracking id is {event['event_original_id']}"
        },
        "point.success" : {
            "title" : "Point success",
            "body" : f"Your point request has been processed successfully. The point tracking id is {event['event_original_id']}"
        },
        "point.failure" : {
            "title" : "Point failure",
            "body" : f"Your point request has failed. The point tracking id is {event['event_original_id']}"
        },
        "payment.created" : {
            "title" : "Payment created",
            "body" : f"Your payment request has been created. The payment tracking id is {event['event_original_id']}"
        },
        "payment.success" : {
            "title" : "Payment success",
            "body" : f"Your payment request has succeeded. The payment tracking id is {event['event_original_id']}"
        },
        "payment.failure" : {
            "title" : "Payment failure",
            "body" : f"Your payment request has failed. The payment tracking id is {event['event_original_id']}"
        },
        'refund.created':{
            "title" : "Refund created",
            "body" : f"Your refund request has been created. The refund tracking id is {event['event_original_id']}"
        },
        'refund.success':{
            "title" : "Refund success",
            "body" : f"Your refund request has succeeded. The refund tracking id is {event['event_original_id']}"
        },
        'refund.failure':{
            "title" : "Refund failure",
            "body" : f"Your refund request has failed. The refund tracking id is {event['event_original_id']}"
        }
    }
    return sample_dict.get(eventKey, {
        "title": "Unknown Event",
        "body": "An event occurred."
    })
def pushNotificationWorkflow(event):
    user_tokens = getCurrentUserTokens(event['userId'])
    payloadInfo = []
    for token_obj in user_tokens:
        information = payloadConstruction(token_obj.getDeviceToken(), event)
        if(information != None):
            response = requests.post(information['fcm_url'], headers=information['headers'], data=json.dumps(information['payload']))
            print(response.status_code, response.text)
            payloadInfo = information
    addToNotifications(event, payloadInfo)






