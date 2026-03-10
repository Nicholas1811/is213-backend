from fastapi import APIRouter, FastAPI, HTTPException
import stripe
from pydantic import BaseModel
import os

# store details from UI into db to create a payment databse entry
# get price from listing (return price * (price * qty))
# get points from userId - perform point verification logic here
    # if have, 201 created row info in payment   
# calculate remaining price from previous step
# if total > 0, call stripe payment
# successful order then populate order db and send message to notification service
    # notification.success topic

app = FastAPI()
router = APIRouter(prefix="/payment")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# stuff to pass in to payment processing
class CheckoutRequest(BaseModel):
    user_id: int
    price: int
    qty: int


@router.post("/process-payment")
async def process_payment(checkout_request: CheckoutRequest):
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "sgd",
                    "product_data": {
                        "name": f"Order for user {checkout_request.user_id}",
                    },
                    "unit_amount": checkout_request.price,
                },
                "quantity": checkout_request.qty,
            }],
            mode="payment",
            success_url="https://localhost:8000/payment/payment-success",
            cancel_url="https://localhost:8000/payment/payment-failed",
        )
        return {"checkout_url": checkout_session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/test")
async def testRoute():
    return {"message": "testing payment"}

# test routes for payment success/fail - to send event to msg broker
@router.get('/payment-success')
async def payment_success():
    try:
        session = stripe.checkout.Session.retrieve()
        if session.payment_status == "paid":
            return {"message": "Payment successful!"}
    except Exception:
            raise HTTPException(status_code=400, detail="Payment not successful.")

@router.get('/payment-failed')
async def payment_failed():
    return {"message": "Payment failed!"}

app.include_router(router)