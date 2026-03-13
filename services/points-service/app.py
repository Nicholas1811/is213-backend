import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from dotenv import load_dotenv
from pydantic import ValidationError
from flask import request


from database import db
from models import UserPointsBalance, PointTransaction
from schemas import TransactionCreate

load_dotenv()

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

@app.route('/points/balance/<uuid:user_id>', methods=['GET'])
def get_user_points(user_id):
    record = UserPointsBalance.query.get(user_id)
    
    if not record:
        return jsonify({"status": "error","message": f"No point record found for User ID: {user_id}"}), 404

    return jsonify({
        "user_id": str(record.user_id),
        "balance": record.current_balance,
        "last_updated": record.last_updated.isoformat()
    }), 200

@app.route('/points/transaction/<uuid:user_id>', methods=['GET'])
def get_user_transaction(user_id):
    records = PointTransaction.query.filter_by(user_id=user_id).order_by(PointTransaction.created_at.desc()).all()
    
    if not records:
        return jsonify({"status": "error","message": f"No point record found for User ID: {user_id}"}), 404
        
    
    outputs = []
    for record in records:
        outputs.append({
                "transaction_id": str(record.id),
                "points_changed": record.points_changed,
                "type": record.transaction_type,
                "reference_id": record.reference_id,
                "timestamp": record.created_at.isoformat()
            })

    return jsonify({
        "user_id": str(record.user_id),
        "transactions": outputs
    }), 200


@app.route('/points/transaction', methods = ['POST'])
def create_transaction():
    try:
        raw_data = request.get_json()
        validated_data = TransactionCreate(**raw_data)

        new_tx = PointTransaction(
            user_id=validated_data.user_id,
            points_changed=validated_data.points_changed,
            transaction_type=validated_data.transaction_type,
            reference_id=validated_data.reference_id
        )

        db.session.add(new_tx)
        db.session.commit()

        return jsonify({"status": "success", "id": str(new_tx.id)}), 201

    except ValidationError as e:
        formatted_errors = []
        for err in e.errors():
            field_name = err["loc"][-1] if err["loc"] else "transaction_logic"
            
            formatted_errors.append({
                "field": field_name,
                "message": err["msg"]
            })
            
        return jsonify({
            "status": "validation_error",
            "errors": formatted_errors
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8080, debug=True)