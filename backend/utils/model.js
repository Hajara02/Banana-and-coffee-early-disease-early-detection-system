const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const fs = require('fs');

let mlModel = null;
const LABELS = ['Banana Bacterial Wilt', 'Coffee Leaf Rust', 'Healthy leaf'];

const loadModel = async () => {
  const modelPath = process.env.MODEL_PATH || path.join(__dirname, '../model/model.json');
  if (!fs.existsSync(modelPath)) {
    console.warn(`ML model not found at ${modelPath}. Falling back to rule-based detection.`);
    return null;
  }

  try {
    mlModel = await tf.loadLayersModel(`file://${modelPath}`);
    console.log('TensorFlow model loaded successfully.');
  } catch (error) {
    console.warn('Failed to load TensorFlow model:', error.message);
    mlModel = null;
  }
};

const decodeBase64Image = (base64) => {
  const buffer = Buffer.from(base64, 'base64');
  return tf.node.decodeImage(buffer, 3);
};

const predictImage = async (photoBase64, crop) => {
  if (!photoBase64 || !mlModel) {
    return null;
  }

  try {
    const imageTensor = decodeBase64Image(photoBase64)
      .resizeBilinear([224, 224])
      .expandDims()
      .toFloat()
      .div(255.0);

    const predictionTensor = mlModel.predict(imageTensor);
    const scores = predictionTensor.dataSync();
    const bestIndex = scores.indexOf(Math.max(...scores));
    const confidence = Number(scores[bestIndex].toFixed(2));
    const prediction = LABELS[bestIndex] || crop === 'banana' ? 'Banana Bacterial Wilt' : 'Coffee Leaf Rust';

    return { prediction, confidence, modelVersion: 'tfjs-v1', note: 'Predicted from image model' };
  } catch (error) {
    console.warn('Error running ML prediction:', error.message);
    return null;
  }
};

module.exports = { loadModel, predictImage };
