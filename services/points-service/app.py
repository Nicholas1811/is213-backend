import os
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from pydantic import ValidationError

from database import db
from schemas import TransactionCreate, PhotoProcessCreate
import services

load_dotenv("../.env")

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/balance/<uuid:user_id>', methods=['GET'])
def get_user_points(user_id):
    record = services.fetch_user_points(user_id)
    if not record:
        return jsonify({"status": "error", "message": "No record found"}), 404
    return jsonify({
        "user_id": str(record.user_id),
        "balance": record.current_balance,
        "last_updated": record.last_updated.isoformat()
    }), 200

@app.route('/transaction/<uuid:user_id>', methods=['GET'])
def get_user_transaction(user_id):
    records = services.fetch_user_transactions(user_id)
    if not records:
        return jsonify({"status": "error", "message": "No transactions found"}), 404
    
    outputs = [{
        "transaction_id": str(r.id),
        "points_changed": r.points_changed,
        "type": r.transaction_type,
        "reference_id": r.reference_id,
        "timestamp": r.created_at.isoformat()
    } for r in records]

    return jsonify({"user_id": str(user_id), "transactions": outputs}), 200

@app.route('/transaction', methods=['POST'])
def create_transaction():
    try:
        validated_data = TransactionCreate(**request.get_json())
        new_tx = services.create_new_transaction(validated_data)
        return jsonify({"status": "success", "id": str(new_tx.id)}), 201
    except ValidationError as e:
        return jsonify({"status": "validation_error", "errors": e.errors()}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/transaction/<uuid:transaction_id>', methods=['PATCH'])
def update_transaction_ref(transaction_id):
    new_ref = request.get_json().get('new_ref_id')
    
    if not new_ref:
        return jsonify({"status": "error", "message": "new_ref_id is required"}), 400

    try:
        updated_tx = services.update_transaction_reference(transaction_id, new_ref)
        
        if not updated_tx:
            return jsonify({"status": "error", "message": "Transaction record not found"}), 404

        return jsonify({
            "status": "success", 
            "transaction_id": str(updated_tx.id),
            "new_reference_id": updated_tx.reference_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/photos/', methods=['POST'])
def create_photo_process():
    try:
        validated_data = PhotoProcessCreate(**request.get_json())
        new_process = services.init_photo_process(validated_data)
        return jsonify({"status": "success", "id": str(new_process.id)}), 201
    except ValidationError as e:
        return jsonify({"status": "validation_error", "errors": e.errors()}), 400

@app.route('/photos/<uuid:transaction_id>', methods=['PATCH'])
def upload_after_image(transaction_id):
    after_url = request.get_json().get('after_image_url')
    if not after_url:
        return jsonify({"status": "error", "message": "after_image_url required"}), 400

    photo_record = services.update_photo_after_image(transaction_id, after_url)
    if not photo_record:
        return jsonify({"status": "error", "message": "Not found"}), 404

    # producer logic is here
    from messaging import publish_to_ai
    publish_to_ai(photo_record.user_id, photo_record.id, photo_record.before_image_url, after_url)

    return jsonify({"status": "success", "transaction_id": str(photo_record.id)}), 200

@app.route('/photos/<uuid:transaction_id>/status', methods=['GET'])
def get_photo_status(transaction_id):
    photo = services.fetch_photo_process(transaction_id)

    if not photo:
        return jsonify({"status": "error", "message": "Not found"}), 404

    return jsonify({
        "status": photo.status,   # pending / approved / rejected
    }), 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8080, debug=True)