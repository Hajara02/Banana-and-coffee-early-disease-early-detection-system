import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.utils import secure_filename

from config import Config
from models import db, User, Report
from ml_model.model import diagnose
from advisory import generate_advisory

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/api/*": {"origins": "*"}})

db.init_app(app)
jwt = JWTManager(app)

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

with app.app_context():
    db.create_all()


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "name": "Banana & Coffee Disease Detection API",
        "version": "2.0",
        "endpoints": {
            "health": "GET /api/health",
            "register": "POST /api/register",
            "login": "POST /api/login",
            "profile": "GET /api/profile",
            "submitReport": "POST /api/report (multipart) or POST /api/report/json (JSON)",
            "listReports": "GET /api/reports",
            "getReport": "GET /api/reports/<id>",
            "batchSync": "POST /api/reports/batch",
        },
        "message": "Use the /api/ endpoints to interact with the API."
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Banana & Coffee Disease Detection API running"})


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    farmer_name = data.get("farmerName", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    location = data.get("location", "")

    if not farmer_name or not phone or not password:
        return jsonify({"error": "farmerName, phone, and password are required"}), 400

    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400

    existing = User.query.filter_by(phone=phone).first()
    if existing:
        token = create_access_token(
            identity=str(existing.id),
            expires_delta=timedelta(seconds=app.config["JWT_ACCESS_TOKEN_EXPIRES"]),
        )
        return jsonify({
            "message": "User already registered",
            "userId": existing.id,
            "token": token,
            "farmer": existing.to_dict(),
        }), 200

    user = User(
        farmer_name=farmer_name,
        phone=phone,
        location=location,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(seconds=app.config["JWT_ACCESS_TOKEN_EXPIRES"]),
    )

    return jsonify({
        "message": "Registration successful",
        "userId": user.id,
        "token": token,
        "farmer": user.to_dict(),
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    phone = data.get("phone", "").strip()
    password = data.get("password", "")

    if not phone or not password:
        return jsonify({"error": "Phone and password are required"}), 400

    user = User.query.filter_by(phone=phone).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid phone number or password"}), 401

    token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(seconds=app.config["JWT_ACCESS_TOKEN_EXPIRES"]),
    )

    return jsonify({
        "message": "Login successful",
        "token": token,
        "userId": user.id,
        "farmer": user.to_dict(),
    }), 200


@app.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"farmer": user.to_dict()}), 200


@app.route("/api/report", methods=["POST"])
@jwt_required()
def submit_report():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    crop = request.form.get("crop", "").strip().lower()
    symptoms_raw = request.form.get("symptoms", "{}")
    comments = request.form.get("comments", "")
    location = request.form.get("location", "")
    farmer_name = request.form.get("farmerName", user.farmer_name)
    phone = request.form.get("phone", user.phone)
    gis_lat = request.form.get("gisLat", type=float)
    gis_lng = request.form.get("gisLng", type=float)

    try:
        symptoms = json.loads(symptoms_raw) if isinstance(symptoms_raw, str) else symptoms_raw
    except (json.JSONDecodeError, TypeError):
        symptoms = {}

    if not crop:
        return jsonify({"error": "Crop type is required (banana or coffee)"}), 400
    if crop not in ("banana", "coffee"):
        return jsonify({"error": "Crop must be 'banana' or 'coffee'"}), 400
    if not symptoms or not any(symptoms.values()):
        return jsonify({"error": "At least one symptom must be selected"}), 400

    image_bytes = None
    photo_path = None
    if "photo" in request.files:
        file = request.files["photo"]
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit(".", 1)[1].lower()
            filename = f"{uuid.uuid4().hex}.{ext}"
            photo_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(photo_path)
            with open(photo_path, "rb") as f:
                image_bytes = f.read()

    diagnosis_result = diagnose(crop, symptoms, image_bytes)
    advisory = generate_advisory(crop, symptoms, diagnosis_result["severity"], diagnosis_result["disease"])

    report = Report(
        user_id=user_id,
        farmer_name=farmer_name,
        phone=phone,
        location=location,
        crop=crop,
        symptoms=json.dumps(symptoms),
        comments=comments,
        photo_path=photo_path,
        gis_lat=gis_lat,
        gis_lng=gis_lng,
        diagnosis=diagnosis_result["disease"],
        severity=diagnosis_result["severity"],
        confidence=diagnosis_result["confidence"],
        ml_confidence=diagnosis_result.get("mlConfidence"),
        treatment=json.dumps(advisory["treatment"]),
        prevention=json.dumps(advisory["prevention"]),
        best_practices=json.dumps(advisory["bestPractices"]),
        created_at=datetime.now(timezone.utc),
        synced=True,
    )
    db.session.add(report)
    db.session.commit()

    response = report.to_dict()
    response["advisory"] = advisory

    return jsonify(response), 201


@app.route("/api/report/json", methods=["POST"])
@jwt_required()
def submit_report_json():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    crop = data.get("crop", "").strip().lower()
    symptoms = data.get("symptoms", {})
    comments = data.get("comments", "")
    location = data.get("location", "")
    farmer_name = data.get("farmerName", user.farmer_name)
    phone = data.get("phone", user.phone)
    gis = data.get("gis")
    photo_base64 = data.get("photoBase64")

    if not crop:
        return jsonify({"error": "Crop type is required (banana or coffee)"}), 400
    if crop not in ("banana", "coffee"):
        return jsonify({"error": "Crop must be 'banana' or 'coffee'"}), 400

    image_bytes = None
    if photo_base64:
        try:
            import base64
            image_bytes = base64.b64decode(photo_base64)
        except Exception:
            pass

    diagnosis_result = diagnose(crop, symptoms, image_bytes)
    advisory = generate_advisory(crop, symptoms, diagnosis_result["severity"], diagnosis_result["disease"])

    report = Report(
        user_id=user_id,
        farmer_name=farmer_name,
        phone=phone,
        location=location,
        crop=crop,
        symptoms=json.dumps(symptoms),
        comments=comments,
        gis_lat=gis.get("lat") if gis else None,
        gis_lng=gis.get("lng") if gis else None,
        diagnosis=diagnosis_result["disease"],
        severity=diagnosis_result["severity"],
        confidence=diagnosis_result["confidence"],
        ml_confidence=diagnosis_result.get("mlConfidence"),
        treatment=json.dumps(advisory["treatment"]),
        prevention=json.dumps(advisory["prevention"]),
        best_practices=json.dumps(advisory["bestPractices"]),
        created_at=datetime.now(timezone.utc),
        synced=True,
    )
    db.session.add(report)
    db.session.commit()

    response = report.to_dict()
    response["advisory"] = advisory

    return jsonify(response), 201


@app.route("/api/reports", methods=["GET"])
@jwt_required()
def get_reports():
    user_id = int(get_jwt_identity())
    reports = (
        Report.query.filter_by(user_id=user_id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return jsonify({
        "count": len(reports),
        "reports": [r.to_dict() for r in reports],
    }), 200


@app.route("/api/reports/<int:report_id>", methods=["GET"])
@jwt_required()
def get_report(report_id):
    user_id = int(get_jwt_identity())
    report = Report.query.filter_by(id=report_id, user_id=user_id).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404

    result = report.to_dict()
    result["advisory"] = {
        "treatment": json.loads(report.treatment) if report.treatment else [],
        "prevention": json.loads(report.prevention) if report.prevention else [],
        "bestPractices": json.loads(report.best_practices) if report.best_practices else [],
    }
    return jsonify(result), 200


@app.route("/api/reports/batch", methods=["POST"])
@jwt_required()
def batch_sync():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data or "reports" not in data:
        return jsonify({"error": "Reports array is required"}), 400

    synced = []
    for entry in data["reports"]:
        crop = entry.get("crop", "").strip().lower()
        symptoms = entry.get("symptoms", {})
        comments = entry.get("comments", "")
        location = entry.get("location", "")
        gis = entry.get("gis")

        if crop not in ("banana", "coffee"):
            continue

        photo_base64 = entry.get("photoBase64")
        image_bytes = None
        if photo_base64:
            try:
                import base64
                image_bytes = base64.b64decode(photo_base64)
            except Exception:
                pass

        diagnosis_result = diagnose(crop, symptoms, image_bytes)
        advisory = generate_advisory(
            crop, symptoms, diagnosis_result["severity"], diagnosis_result["disease"]
        )

        report = Report(
            user_id=user_id,
            farmer_name=entry.get("farmerName", user.farmer_name),
            phone=entry.get("phone", user.phone),
            location=location,
            crop=crop,
            symptoms=json.dumps(symptoms),
            comments=comments,
            gis_lat=gis.get("lat") if gis else None,
            gis_lng=gis.get("lng") if gis else None,
            diagnosis=diagnosis_result["disease"],
            severity=diagnosis_result["severity"],
            confidence=diagnosis_result["confidence"],
            ml_confidence=diagnosis_result.get("mlConfidence"),
            treatment=json.dumps(advisory["treatment"]),
            prevention=json.dumps(advisory["prevention"]),
            best_practices=json.dumps(advisory["bestPractices"]),
            created_at=datetime.now(timezone.utc),
            synced=True,
        )
        db.session.add(report)
        db.session.commit()
        synced.append(report.to_dict())

    return jsonify({"synced": len(synced), "reports": synced}), 201


@app.route("/api/uploads/<filename>", methods=["GET"])
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/api/ml/train", methods=["POST"])
def train_model():
    return jsonify({
        "message": "Model training endpoint. Upload a dataset to train the CNN model.",
        "status": "not_implemented",
    }), 501


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
