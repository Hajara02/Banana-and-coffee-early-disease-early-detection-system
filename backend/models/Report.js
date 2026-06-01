const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  farmerName: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, default: 'Unknown' },
  crop: { type: String, required: true, lowercase: true },
  symptoms: { type: Object, required: true },
  comments: { type: String, default: '' },
  gis: {
    lat: { type: Number },
    lng: { type: Number }
  },
  photoBase64: { type: String, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mlPrediction: { type: Object, default: null },
  outcome: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
