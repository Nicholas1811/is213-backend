from email.policy import default
from inspect import EndOfBlock

from temporalio import activity
import requests

#Endpoint for here is to get the price. from there, we will x the price and quantity.
#This is step 1, we will get the price (price x quantity) needed.

@activity.defn
async def purchase_listing(data):
    listing_id = data['listing_id']
    r = requests.post(
        f"http://listing-service:9999/listings/{listing_id}/purchase",
        json={
            "qty" : data['qty']
        }
    )
    print("Status code is" , r.status_code)
    print("Data is" , r.json())
    if(r.status_code >= 400 or r.status_code >= 500):
        raise Exception("Failed to reserve listing")
    return r.json()

@activity.defn
async def reset_listing(data):
    listing_id = data['listing_id']
    r = requests.post(
        f"http://listing-service:9999/listings/{listing_id}/restock",
        json={
            "qty" : data['qty']
        }
    )
    if(r.status_code >= 400 or r.status_code >= 500):
        raise Exception("Failed to reserve listing")
    return r.json()