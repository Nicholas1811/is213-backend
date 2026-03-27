from database import db
import uuid
from datetime import datetime

class UserPointsBalance(db.Model):
    __tablename__ = 'user_points_balance'
    
    user_id = db.Column(db.UUID(as_uuid=True), primary_key=True)
    current_balance = db.Column(db.Integer, default=0, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PointTransaction(db.Model):
    __tablename__ = 'point_transactions'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.UUID(as_uuid=True), nullable=False)
    points_changed = db.Column(db.Integer, nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)
    reference_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('reference_id', 'transaction_type', name='unique_tx_per_type'),)

class PhotoProcess(db.Model):
    __tablename__ = 'photo_processes_points'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.UUID(as_uuid=True), nullable=False)
    
    before_image_url = db.Column(db.Text, nullable=False)
    after_image_url = db.Column(db.Text, nullable=True)
    
    status = db.Column(db.String(20), default='pending')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)