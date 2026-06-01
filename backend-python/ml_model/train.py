import os
import sys
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def create_dummy_dataset():
    num_samples = 200
    images = []
    labels = []
    for i in range(num_samples):
        img = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
        images.append(img)
        label = 1 if i < num_samples // 2 else 0
        labels.append(label)
    return np.array(images), np.array(labels)


def build_model():
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import (
        Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
    )
    from tensorflow.keras.optimizers import Adam

    model = Sequential([
        Conv2D(32, (3, 3), activation="relu", input_shape=(224, 224, 3)),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Conv2D(64, (3, 3), activation="relu"),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Conv2D(128, (3, 3), activation="relu"),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Conv2D(256, (3, 3), activation="relu"),
        BatchNormalization(),
        MaxPooling2D(2, 2),

        Flatten(),
        Dense(512, activation="relu"),
        Dropout(0.5),
        Dense(256, activation="relu"),
        Dropout(0.3),
        Dense(2, activation="softmax"),
    ])

    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def train():
    try:
        model = build_model()
    except ImportError:
        print("TensorFlow is not installed.")
        print("Install it with: pip install tensorflow")
        print("Without TensorFlow, the system will use symptom-based diagnosis only.")
        return None

    print("Model architecture created.")
    print("Generating dummy dataset for demonstration...")
    X, y = create_dummy_dataset()
    X = X.astype(np.float32) / 255.0
    model.fit(X, y, epochs=5, batch_size=16, validation_split=0.2, verbose=1)
    save_path = os.path.join(BASE_DIR, "ml_model", "disease_model.h5")
    model.save(save_path)
    print(f"Model saved to {save_path}")
    test_loss, test_acc = model.evaluate(X[:32], y[:32], verbose=0)
    print(f"Test accuracy: {test_acc:.4f}")
    return save_path


if __name__ == "__main__":
    train()
