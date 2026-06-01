from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    farmer_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    reports = db.relationship("Report", backref="farmer", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "farmerName": self.farmer_name,
            "phone": self.phone,
            "location": self.location,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    farmer_name = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    location = db.Column(db.String(200))
    crop = db.Column(db.String(50), nullable=False)
    symptoms = db.Column(db.Text, nullable=False)
    comments = db.Column(db.Text)
    photo_path = db.Column(db.String(300))
    gis_lat = db.Column(db.Float)
    gis_lng = db.Column(db.Float)
    diagnosis = db.Column(db.String(100))
    severity = db.Column(db.String(50))
    confidence = db.Column(db.Float)
    treatment = db.Column(db.Text)
    prevention = db.Column(db.Text)
    best_practices = db.Column(db.Text)
    ml_confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    synced = db.Column(db.Boolean, default=True)

    def to_dict(self):
        import json
        symptoms_raw = self.symptoms
        try:
            symptoms_dict = json.loads(symptoms_raw) if isinstance(symptoms_raw, str) else symptoms_raw
        except (json.JSONDecodeError, TypeError):
            symptoms_dict = {}
        return {
            "id": self.id,
            "userId": self.user_id,
            "farmerName": self.farmer_name,
            "phone": self.phone,
            "location": self.location,
            "crop": self.crop,
            "symptoms": symptoms_dict,
            "comments": self.comments,
            "photoPath": self.photo_path,
            "gis": {"lat": self.gis_lat, "lng": self.gis_lng} if self.gis_lat else None,
            "diagnosis": self.diagnosis,
            "severity": self.severity,
            "confidence": self.confidence,
            "treatment": self.treatment,
            "prevention": self.prevention,
            "bestPractices": self.best_practices,
            "mlConfidence": self.ml_confidence,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "synced": self.synced,
        }
