from database import db
from models import UserPointsBalance, PointTransaction, PhotoProcess

def fetch_user_points(user_id):
    return UserPointsBalance.query.get(user_id)

def fetch_user_transactions(user_id):
    return PointTransaction.query.filter_by(user_id=user_id).order_by(PointTransaction.created_at.desc()).all()

def create_new_transaction(validated_data):
    new_tx = PointTransaction(
        user_id=validated_data.user_id,
        points_changed=validated_data.points_changed,
        transaction_type=validated_data.transaction_type,
        reference_id=validated_data.reference_id
    )
    db.session.add(new_tx)
    db.session.commit()
    return new_tx

def update_transaction_reference(transaction_id, new_ref):
    transaction = PointTransaction.query.get(transaction_id)
    if not transaction:
        return None
    transaction.reference_id = str(new_ref)
    db.session.commit()
    return transaction

def init_photo_process(validated_data):
    new_process = PhotoProcess(
        user_id=validated_data.user_id,
        before_image_url=validated_data.before_image_url,
        status='pending'
    )
    db.session.add(new_process)
    db.session.commit()
    return new_process

def update_photo_after_image(trans_id, after_url):
    photo_record = PhotoProcess.query.get(trans_id)
    if not photo_record:
        return None
    photo_record.after_image_url = after_url
    photo_record.status = 'processing'
    db.session.commit()
    return photo_record

def fetch_photo_process(photo_id):
    return PhotoProcess.query.get(photo_id)

def handle_ai_verdict(trans_id, user_id, status):
    #fetch
    photo_record = PhotoProcess.query.get(trans_id)
    
    if not photo_record:
        return False

    try:
        if status == "approved":
            #patch photo record
            photo_record.status = 'awarded'
            
            #add new transaction row
            new_tx = PointTransaction(
                user_id=user_id,
                points_changed=50,
                transaction_type="EARN",
                reference_id=str(trans_id)
            )
            db.session.add(new_tx)
            
        else:
            #patch photo record
            photo_record.status = 'rejected'

        db.session.commit()

        from messaging import publish_notification
        publish_notification(user_id,trans_id,status)
        

        return True

    except Exception as e:
        db.session.rollback()
        print(f" [!] Database Error during trans_id {trans_id}: {e}")
        return False