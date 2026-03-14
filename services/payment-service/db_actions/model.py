from sqlalchemy import Column, DateTime, Integer, String, Float
from .db import Base

class Payment(Base):
    __tablename__ = "payments"
    payment_id = Column(Integer, primary_key=True, index=True)
    payment_stripe_id = Column(String(255), nullable=False)
    user_id = Column(String(255), nullable=False)
    payment_intent_id = Column(String(255), nullable=False)
    listing_id = Column(Integer, nullable=False)
    quantity = Column(Float, nullable=False)
    payment_created = Column(DateTime, nullable=False)
    payment_updated = Column(DateTime, nullable=False)