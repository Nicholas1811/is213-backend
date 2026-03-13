from fastapi import APIRouter, Depends, FastAPI, HTTPException
import stripe
from pydantic import BaseModel, field_validator
import os
from sqlalchemy.orm import Session
from db_actions.model import Payment
from db_actions.service import create_payment, get_payment_by_id
from db_actions.db import SessionLocal, engine, Base

app = FastAPI()
router = APIRouter(prefix="/payment")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# set up db
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# stuff to pass in to payment processing
class CheckoutRequest(BaseModel):
    user_id: int
    price: int
    qty: int

    # to check with db side if exists (placeholder)
    @field_validator('user_id')
    def checkUserId(cls, v):
        if v <= 0:
            raise ValueError("User ID must be a positive integer")
        return v

    @field_validator('price')
    def checkPrice(cls, v):
        if v <= 0:
            raise ValueError("Price must be a positive integer")
        return v

    @field_validator('qty')
    def checkQty(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be a positive integer")
        return v

class RefundRequest(BaseModel):
    payment_id: str
    amount: int

    #check with db - to be implemented
    @field_validator('payment_id')
    def checkPaymentId(cls, v):
        if not v:
            raise ValueError("Payment ID must be provided")
        return v

@router.post("/process-payment")
async def process_payment(checkout_request: CheckoutRequest, db: Session = Depends(get_db)):
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

        return {"checkout_url": checkout_session.url, "checkout_id" : checkout_session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/refund")
async def refund_payment(refund_request: RefundRequest):
    try:
        refund = stripe.Refund.create(
            payment_intent=refund_request.payment_id,
            amount=refund_request.amount,
        )
        return {"refund_id": refund.id, "status": refund.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# test routes for payment success/fail - to send event to msg broker
@router.get("/test")
async def testRoute():
    return {"message": "testing payment"}

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