from sqlalchemy.orm import Session
from .model import Payment

def create_payment(db: Session, payment_id: str, listing_id: int, user_id: str, quantity: float, payment_created):
    db_payment = Payment(payment_id=payment_id, listing_id=listing_id, user_id=user_id, quantity=quantity, payment_created=payment_created)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payment_by_id(db: Session, payment_id: str):
    return db.query(Payment).filter(Payment.payment_id == payment_id).first()
