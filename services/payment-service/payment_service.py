from fastapi import FastAPI

app = FastAPI()

# store details from UI into db to create a payment databse entry
# get price from listing (return price * (price * qty))
# get points from userId - perform point verification logic here
    # if have, 201 created row info in payment   
# calculate remaining price from previous step
# if total > 0, call stripe payment
# successful order then populate order db and send message to notification service
    # notification.success topic

@app.get("/")
async def root():
    return {"message": "hello world"}