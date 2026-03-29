from sqlalchemy.orm import Session
from .model import Payment

def create_payment(db: Session, payment_data: Payment):
    db.add(payment_data)
    db.commit()
    db.refresh(payment_data)
    return payment_data

def get_payment_by_id(db: Session, payment_stripe_id: str):
    return db.query(Payment).filter(Payment.payment_stripe_id == payment_stripe_id).first()
