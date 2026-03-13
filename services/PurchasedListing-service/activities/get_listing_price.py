from email.policy import default
from inspect import EndOfBlock

from temporalio import activity
import requests

#Endpoint for here is to get the price. from there, we will x the price and quantity.
#This is step 1, we will get the price (price x quantity) needed.

@activity.defn
async def purchase_listing(data):
    listing_id = data['listing_id']
    data = requests.post(
        f"http://host.docker.internal:9999/listings/{listing_id}/purchase",
        json={
            "qty" : data['qty']
        }
    )
    print("Status code is" , data.status_code)
    print("Data is" , data.json())
    if(data.status_code >= 400 or data.status_code >= 500):
        raise Exception("Failed to reserve listing")
    return data.json()

@activity.defn
async def reset_listing(data):
    listing_id = data['listing_id']
    requests.post(
        f"http://host.docker.internal:9999/listings/{listing_id}/restock",
        json={
            "qty" : data['qty']
        }
    )
    if(data.status_code >= 400 or data.status_code >= 500):
        raise Exception("Failed to reserve listing")
    return data.json()