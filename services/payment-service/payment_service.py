import json
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
import stripe
import time
from pydantic import BaseModel, field_validator
import os
from sqlalchemy.orm import Session
from sqlalchemy import select
from db_actions.model import Payment
from db_actions.service import create_payment, get_payment_by_id
from db_actions.db import SessionLocal, engine, Base
from datetime import datetime

from temporalio.client import Client

app = FastAPI()
router = APIRouter()
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
stripe.webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")



# set up db
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# stuff to pass in to payment processing - to check with db
class CheckoutRequest(BaseModel):
    user_id: str
    price: int
    listing_id: int
    order_id: int
    quantity_to_update: int
    points_changed: int
    workflow_id: str


#Set up temporal connection 
temporal_client = None

@app.on_event("startup")
async def startup_event():
    global temporal_client
    try:
        temporal_client = await Client.connect("temporal:7233")
        print("--- TEMPORAL CLIENT CONNECTED AT STARTUP ---")
    except Exception as e:
        print(f"--- FAILED TO CONNECT TEMPORAL AT STARTUP: {e} ---")


@router.post("/process-payment")
async def process_payment(checkout_request: CheckoutRequest):
    expiry_time = int(time.time()) + (30 * 60)
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            expires_at=expiry_time,
            line_items=[{
                "price_data": {
                    "currency": "sgd",
                    "product_data": {
                        "name": f"Order for user {checkout_request.user_id}",
                    },
                    "unit_amount": checkout_request.price,
                },
                "quantity": 1
            }],
            mode="payment",
            success_url="http://localhost:5173/buyer/orders",
            cancel_url="http://localhost:5173/buyer/orders",
            metadata={
                "user_id": checkout_request.user_id,
                "price": checkout_request.price,
                "listing_id": checkout_request.listing_id,
                "quantity": checkout_request.quantity_to_update,
                "points_changed": checkout_request.points_changed,
                "order_id": checkout_request.order_id,
                "workflow_id": checkout_request.workflow_id
            }
        )
        return {"checkout_url": checkout_session.url, "checkout_id" : checkout_session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, stripe.webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Parse the raw payload as a plain dict to avoid StripeObject quirks
    raw_event = json.loads(payload)

    print(f"--- WEBHOOK RECEIVED: {raw_event['type']} ---")
    if raw_event['type'] == 'checkout.session.completed':
        session = raw_event['data']['object']
        
        payment_stripe_id = session.get("id")
        payment_intent_id = session.get("payment_intent")
        metadata = session.get("metadata", {})
        
        workflow_id = metadata.get("workflow_id")

        print(f"--- WORKFLOW ID FOUND: {workflow_id} ---")
        if workflow_id:
            try:
                print(f"--- ATTEMPTING SIGNAL TO: {workflow_id} ---")
                if temporal_client:
                    handle = temporal_client.get_workflow_handle(workflow_id)
                    await handle.signal("confirm_payment")
                    print("--- SIGNAL SENT SUCCESSFULLY ---")
                else:
                    print("--- ERROR: Temporal client not initialized ---")
            except Exception as e:
                print(f"Failed to signal Temporal: {e}")

        new_payment = Payment(
                payment_stripe_id=payment_stripe_id,
                user_id=metadata.get("user_id"),
                payment_intent_id=payment_intent_id,
                listing_id=int(metadata.get("listing_id", 0)),
                quantity=int(metadata.get("quantity", 0)),
                payment_created=datetime.now(),
                payment_updated=datetime.now()
            )
        
        try:
            create_payment(payment_data=new_payment, db=db)
        except Exception as e:
            print(e)

    return {"status": "success"}

class RefundRequest(BaseModel):
    payment_checkout_id: str

    #check with db - to be implemented
    @field_validator('payment_checkout_id')
    def checkPaymentId(cls, v):
        if not v:
            raise ValueError("Payment Checkout ID must be provided")
        return v

@router.post("/refund")
async def refund_payment(refund_request: RefundRequest, db: Session = Depends(get_db)):
    # pass in parent checkout id to get the payment intent id
    payment_intent_id = db.execute(select(Payment.payment_intent_id).where(Payment.payment_stripe_id == refund_request.payment_checkout_id)).scalars().first()
    if not payment_intent_id:
        raise HTTPException(status_code=404, detail="Payment not found")
    try:
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id
        )
        return {"refund_id": refund.id, "status": refund.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# test routes for payment success/fail - to send event to msg broker
@router.get("/test")
async def testRoute():
    return {"message": "testing payment"}

@router.get('/payment-success')
async def payment_success(session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            return {"message": "Payment successful!"}
    except Exception:
            raise HTTPException(status_code=400, detail="Payment not successful.")

@router.get('/payment-failed')
async def payment_failed():
    return {"message": "Payment failed!"}

app.include_router(router)