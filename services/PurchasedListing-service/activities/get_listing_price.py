from inspect import EndOfBlock

from temporalio import activity
import requests

#Endpoint for here is to get the price. from there, we will x the price and quantity.
#This is step 1, we will get the price (price x quantity) needed.

@activity.defn
async def get_listing_price(listing_id: int):
    #For this endpoint, we will need to also check for availble quantity.
    #If is too low, then that method will raise exception.
    r = requests.get(
        f"http://listing-service:8080/listings/{listing_id}"
    )

    data = r.json()

    return {
        "price": data["price"],
        "available": data["available"]
    }