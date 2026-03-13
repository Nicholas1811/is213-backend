from email.policy import default
from inspect import EndOfBlock

from temporalio import activity
import requests

#Endpoint for here is to get the price. from there, we will x the price and quantity.
#This is step 1, we will get the price (price x quantity) needed.

@activity.defn
async def purchase_listing(data):
    listing_id = data['listing_id']
    data = requests.get(
        f"http://host.docker.internal:9999/listings/{listing_id}/purchase",
        json={
            "qty" : data['qty']
        }
    )
    print("Data is" , data.json())
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