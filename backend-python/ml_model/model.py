import io
import os
import numpy as np
from PIL import Image

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SYMPTOM_WEIGHTS = {
    "banana": {
        "wilting": 3,
        "yellowLeaves": 2,
        "boiledAppearance": 3,
        "ooze": 3,
        "rottenPseudostem": 2,
        "leafSpots": 1,
        "stuntedGrowth": 1,
    },
    "coffee": {
        "rustSpots": 3,
        "defoliation": 2,
        "powderyDust": 2,
        "brownNecrosis": 1,
        "stuntedGrowth": 1,
        "yellowLeaves": 1,
        "wilting": 1,
    },
}

DISEASE_THRESHOLDS = {
    "banana": {
        "high": {"min_score": 7, "disease": "Banana Bacterial Wilt"},
        "medium": {"min_score": 4, "disease": "Possible Banana Bacterial Wilt"},
        "low": {"min_score": 0, "disease": "No strong banana wilt signal detected"},
    },
    "coffee": {
        "high": {"min_score": 7, "disease": "Coffee Leaf Rust"},
        "medium": {"min_score": 4, "disease": "Possible Coffee Leaf Rust"},
        "low": {"min_score": 0, "disease": "No strong coffee rust signal detected"},
    },
}

SEVERITY_MAP = {
    "high": "severe",
    "medium": "moderate",
    "low": "mild",
}


def load_model():
    model_path = os.environ.get(
        "MODEL_PATH", os.path.join(BASE_DIR, "ml_model", "disease_model.h5")
    )
    if os.path.exists(model_path):
        try:
            from tensorflow.keras.models import load_model as tf_load_model
            return tf_load_model(model_path)
        except ImportError:
            print("TensorFlow not available. Install tensorflow for image-based ML diagnosis.")
            return None
        except Exception:
            return None
    return None


_model_instance = None


def get_model():
    global _model_instance
    if _model_instance is None:
        _model_instance = load_model()
    return _model_instance


def preprocess_image(image_bytes: bytes, target_size=(224, 224)):
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize(target_size, Image.LANCZOS)
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception:
        return None


def predict_image(image_bytes: bytes, crop: str):
    model = get_model()
    if model is None:
        return None

    img_array = preprocess_image(image_bytes)
    if img_array is None:
        return None

    try:
        predictions = model.predict(img_array, verbose=0)
        class_names = {
            "banana": ["healthy_banana", "banana_bacterial_wilt"],
            "coffee": ["healthy_coffee", "coffee_leaf_rust"],
        }
        classes = class_names.get(crop, class_names["banana"])
        predicted_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_idx])
        return {
            "predictedClass": classes[predicted_idx] if predicted_idx < len(classes) else "unknown",
            "confidence": confidence,
            "allProbabilities": {
                classes[i]: float(predictions[0][i])
                for i in range(min(len(classes), len(predictions[0])))
            },
        }
    except Exception:
        return None


def analyze_symptoms(crop: str, symptoms: dict):
    crop = crop.lower()
    weights = SYMPTOM_WEIGHTS.get(crop, {})
    score = sum(
        weights.get(key, 0) * (1 if value else 0)
        for key, value in symptoms.items()
    )

    thresholds = DISEASE_THRESHOLDS.get(crop, DISEASE_THRESHOLDS["banana"])
    severity = "low"
    disease = thresholds["low"]["disease"]
    confidence = 0.0

    if score >= thresholds["high"]["min_score"]:
        severity = "high"
        disease = thresholds["high"]["disease"]
        confidence = min(0.95, 0.5 + score * 0.065)
    elif score >= thresholds["medium"]["min_score"]:
        severity = "medium"
        disease = thresholds["medium"]["disease"]
        confidence = min(0.85, 0.3 + score * 0.08)
    else:
        severity = "low"
        disease = thresholds["low"]["disease"]
        confidence = min(0.5, score * 0.1)

    return {
        "disease": disease,
        "severity": SEVERITY_MAP.get(severity, "mild"),
        "confidence": round(confidence, 4),
        "score": score,
    }


def diagnose(crop: str, symptoms: dict, image_bytes: bytes = None):
    symptom_result = analyze_symptoms(crop, symptoms)
    disease = symptom_result["disease"]
    severity = symptom_result["severity"]
    confidence = symptom_result["confidence"]
    ml_confidence = None

    if image_bytes:
        image_result = predict_image(image_bytes, crop)
        if image_result:
            ml_confidence = image_result["confidence"]
            if image_result["confidence"] > 0.6:
                disease = image_result["predictedClass"].replace("_", " ").title()
                confidence = (confidence + image_result["confidence"]) / 2

    return {
        "disease": disease,
        "severity": severity,
        "confidence": round(confidence, 4),
        "mlConfidence": round(ml_confidence, 4) if ml_confidence else None,
        "symptomScore": symptom_result["score"],
    }
