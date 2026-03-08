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
from google.oauth2 import service_account
from google.auth.transport.requests import Request

app = FastAPI()

## this thing does a push to the DB

load_dotenv()

# Authentication for lambda.
def lambdaAuthenticate():
    try:
        credentials_info = {
            "type": "service_account",
            "client_email": os.environ["client_email"],
            "private_key": os.environ["private_key"].replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token"
        }
        scopes = ["https://www.googleapis.com/auth/firebase.messaging"]
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=scopes
        )
        credentials.refresh(Request())
        return credentials.token

    except Exception as err:
        return None

# current user tokens
def getCurrentUserTokens(userId):
    user_tokens = requests.get(f"https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens/{userId}")
    user_tokens.raise_for_status()
    data = user_tokens.json()
    result = [NotificationToken(item['Id'], item['createdAt'], item['device_token'], item['userId'])for item in data]
    return result

## Making the payload for each notification.
def payloadConstruction(device_token, event, authentication_result):

    if(authentication_result != None):
        headers = Header(authentication_result, "application/json; UTF-8").showHeader()
        payload = {
            "message": {
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
            "fcm_url" : "https://fcm.googleapis.com/v1/projects/notification-is213/messages:send"
        }
    return None

def addToNotifications(notification):
    try:
        result = requests.post(
            "https://personal-fsn5aajc.outsystemscloud.com/NotificationService/rest/Notifications/notifications",
            json=notification
        )

        # 409 = duplicate event_id
        if result.status_code == 409:
            print("Duplicate event detected. Skipping processing.")
            return False

        result.raise_for_status()
        return True

    except Exception as e:
        print("Persistence error:", e)
        return False

def pushNotificationWorkflow(event):
    notif_content = event_dictionary(event)
    notification = Notification(
        notif_content['title'],
        notif_content['body'],
        event['key'],
        event['userId'],
        event['event_id']
    ).notification_body()
    saved = addToNotifications(notification)
    if not saved:
        return
    authentication_result = lambdaAuthenticate()
    if not authentication_result:
        print("Authentication failed.")
        return

    user_tokens = getCurrentUserTokens(event['userId'])

    for token_obj in user_tokens:
        information = payloadConstruction(
            token_obj.getDeviceToken(),
            event,
            authentication_result
        )

        if information:
            response = requests.post(
                information['fcm_url'],
                headers=information['headers'],
                data=json.dumps(information['payload'])
            )
            print(response.status_code, response.text)

def event_dictionary(event):
    eventKey = event['key']
    sample_dict = {
        "order.created" : {
            "title" : "Order created",
            "body" : f"Your order has been created. The order id is {event['event_original_id']}. To view more, click on me!"
        },
        "order.success" : {
            "title" : "Order Success",
            "body" : f"Your order has been successfully processed. The order id is {event['event_original_id']}. To view more, click on me!"
        },
        "order.failure" : {
            "title" : "Order failure",
            "body" : f"Your order has failed. The order id is {event['event_original_id']}. To view more, click on me!"
        },
        "point.created" : {
            "title" : "Point created",
            "body" : f"Your point request has been created. The point tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        "point.success" : {
            "title" : "Point success",
            "body" : f"Your point request has been processed successfully. The point tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        "point.failure" : {
            "title" : "Point failure",
            "body" : f"Your point request has failed. The point tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        "payment.created" : {
            "title" : "Payment created",
            "body" : f"Your payment request has been created. The payment tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        "payment.success" : {
            "title" : "Payment success",
            "body" : f"Your payment request has succeeded. The payment tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        "payment.failure" : {
            "title" : "Payment failure",
            "body" : f"Your payment request has failed. The payment tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        'refund.created':{
            "title" : "Refund created",
            "body" : f"Your refund request has been created. The refund tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        'refund.success':{
            "title" : "Refund success",
            "body" : f"Your refund request has succeeded. The refund tracking id is {event['event_original_id']}. To view more, click on me!"
        },
        'refund.failure':{
            "title" : "Refund failure",
            "body" : f"Your refund request has failed. The refund tracking id is {event['event_original_id']}. To view more, click on me!"
        }
    }
    return sample_dict.get(eventKey, {
        "title": "Unknown Event",
        "body": "An event occurred."
    })