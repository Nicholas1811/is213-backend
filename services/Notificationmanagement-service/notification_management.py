from doctest import debug
from hmac import new
from http.client import responses
from pyexpat.errors import messages

from fastapi import FastAPI
import requests
import json

import os
from dotenv import load_dotenv

app = FastAPI()

## this thing does a push to the DB

load_dotenv()
## workflow for this push-notificaton

## 1. when frontend approves, it will generate a token_id, which will be sent to FCM directly.
## 2. we should store the token in an outsystems db, so that we can always query and check later.
## 3. After send to FCM, then now, everything is using that to authenticate.
## 4. When there is an event, the load will be passed to this method. the method does a few things.
## 5. it adds to outsystems Notifcations DB, and then from there, this method to send it straight to FCM.
## 6. FCM then send to the device using the token_id it received from this method.

## AWS Lambda Authentication Adapter for us to authenticate our backend to push messages to FCM.
## send to outsystems db
## send to FCM.

## Making workflow boundaries clear.
def lambdaAuthenticate():
    authentication_result = requests.post("https://vxyrvhbczwwjsytja4riojwe6u0ffwwa.lambda-url.ap-southeast-1.on.aws/").json()
    if(authentication_result!= None):
        return authentication_result['access_token']
    return None

## Making the payload for each notification.
def payloadConstruction(authentication_result):
    project_id = "notification-is213"
    fcm_url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    headers = {
        "Authorization": f"Bearer {authentication_result}",
        "Content-Type": "application/json; UTF-8",
    }
    payload = {
        "message": {
        ## this is the device registration token you should get from the client app.
        ## this is the authentication between the FCM and the client (authenticate client with FCM)
        ## temp keys, we will be tying our users to this.
            ## TODO, get current user's tokens.
            "token": "cqK8dOj6-OI5RWNmm5sgR0:APA91bEM2_sMb-mzcBOBkxtUsFemrh98L9pCogX4FaTj6fooWArsW2n3A1g2_OxjFoDnYlK_b5ioDQ1PZIlv_70jlaWuM8asRITvraSe_3I8kF7KPg7wn0g",
            "notification": {
                "title": "Hello 👋",
                "body": "This is a test notification from Python",
            },
            "data": {
                "key1": "value1",
                "key2": "value2"
            }
        }
    }
    return {
        "headers" : headers,
        "payload" : payload,
        "fcm_url" : fcm_url
    }

def pushNotificationWorkflow():
    authentication_result = lambdaAuthenticate()
    if authentication_result:
        information =  payloadConstruction(authentication_result)
        response = requests.post(information['fcm_url'], headers=information['headers'], data=json.dumps(information['payload']))
        print(response.status_code, response.text)

##TODO, add to notifications DB.
def addToOutsystemsDB():
    pass

@app.post("/push-notification")
def pushNotification():
    pushNotificationWorkflow()


