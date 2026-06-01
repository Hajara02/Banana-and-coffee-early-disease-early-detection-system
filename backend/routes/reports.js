const express = require('express');
const Report = require('../models/Report');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { predictImage } = require('../utils/model');

const router = express.Router();

const analyzeSymptoms = (data) => {
  const crop = data.crop.toLowerCase();
  const symptoms = data.symptoms || {};
  const score = { banana: 0, coffee: 0 };

  if (crop === 'banana') {
    if (symptoms.wilting) score.banana += 3;
    if (symptoms.yellowLeaves) score.banana += 2;
    if (symptoms.boiledAppearance || symptoms.ooze) score.banana += 3;
    if (symptoms.rottenPseudostem) score.banana += 2;
    if (symptoms.leafSpots) score.banana += 1;
  }

  if (crop === 'coffee') {
    if (symptoms.rustSpots) score.coffee += 3;
    if (symptoms.defoliation) score.coffee += 2;
    if (symptoms.powderyDust) score.coffee += 2;
    if (symptoms.brownNecrosis) score.coffee += 1;
    if (symptoms.stuntedGrowth) score.coffee += 1;
  }

  let disease = 'unknown';
  let confidence = 'low';
  let risk = 'monitor closely';
  let advice = [];

  if (crop === 'banana') {
    if (score.banana >= 7) {
      disease = 'Banana Bacterial Wilt';
      confidence = 'high';
      risk = 'immediate action needed';
      advice = [
        'Immediately remove and destroy infected banana mats.',
        'Avoid touching healthy plants with tools used on infected areas.',
        'Disinfect cutting tools between uses and practice good sanitation.',
        'Keep infected farms separate from healthy banana fields.',
        'Report the infection to the local extension officer for follow-up.'
      ];
    } else if (score.banana >= 4) {
      disease = 'Possible Banana Bacterial Wilt';
      confidence = 'medium';
      risk = 'high risk';
      advice = [
        'Inspect nearby plants and remove any with early wilting symptoms.',
        'Avoid irrigation water contact with infected material.',
        'Clean tools and boots before moving between plots.',
        'Record the field location and check again after 3 days.'
      ];
    } else {
      disease = 'No strong banana wilt signal detected';
      confidence = 'low';
      risk = 'observe farm closely';
      advice = [
        'Continue regular scouting for yellowing, wilting, and bacterial ooze.',
        'Practice good farm hygiene and avoid transferring sap.',
        'Keep field records and update the system with any new symptoms.'
      ];
    }
  }

  if (crop === 'coffee') {
    if (score.coffee >= 7) {
      disease = 'Coffee Leaf Rust';
      confidence = 'high';
      risk = 'immediate action needed';
      advice = [
        'Prune and remove infected leaves and branches.',
        'Collect and burn fallen leaves to reduce spores.',
        'Apply approved copper-based fungicides according to label instructions.',
        'Improve air circulation by thinning dense branches.',
        'Work with extension staff to schedule a follow-up visit.'
      ];
    } else if (score.coffee >= 4) {
      disease = 'Possible Coffee Leaf Rust';
      confidence = 'medium';
      risk = 'high risk';
      advice = [
        'Check neighbouring coffee plants for rust spots and defoliation.',
        'Remove badly infected leaves and dispose of them safely.',
        'Avoid overhead irrigation that creates wet leaf surfaces.',
        'Monitor the farm daily until symptoms change.'
      ];
    } else {
      disease = 'No strong coffee rust signal detected';
      confidence = 'low';
      risk = 'observe farm closely';
      advice = [
        'Maintain good shade management and remove fallen debris.',
        'Use the system to report new symptoms if they appear.',
        'Keep farm records of leaf health and spray schedules.'
      ];
    }
  }

  return { disease, confidence, risk, advice };
};

router.post('/report', authMiddleware, async (req, res) => {
  const data = req.body;

  if (!data || !data.crop || !data.symptoms) {
    return res.status(400).json({ error: 'Crop and symptoms are required.' });
  }

  try {
    const reportOwner = await User.findById(req.user.id);
    if (!reportOwner) {
      return res.status(401).json({ error: 'Invalid user.' });
    }

    const inferredImage = data.photoBase64 ? await predictImage(data.photoBase64, data.crop) : null;
    const outcome = analyzeSymptoms(data);

    const report = await Report.create({
      farmerName: reportOwner.farmerName,
      phone: reportOwner.phone,
      location: data.location || 'Unknown',
      crop: data.crop,
      symptoms: data.symptoms,
      comments: data.comments || '',
      gis: data.gis || null,
      photoBase64: data.photoBase64 || null,
      userId: reportOwner.id,
      mlPrediction: inferredImage,
      outcome
    });

    return res.json({ report, advisory: outcome });
  } catch (error) {
    console.error('Report submission error', error);
    return res.status(500).json({ error: 'Unable to process report.' });
  }
});

router.get('/reports/:userId', authMiddleware, async (req, res) => {
  const userId = req.params.userId;
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const userReports = await Report.find({ userId }).sort({ createdAt: -1 });
    res.json({ count: userReports.length, reports: userReports });
  } catch (error) {
    console.error('Fetch user reports error', error);
    res.status(500).json({ error: 'Unable to load reports.' });
  }
});

router.get('/reports', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only.' });
  }

  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ count: reports.length, reports });
  } catch (error) {
    console.error('Fetch reports error', error);
    res.status(500).json({ error: 'Unable to load all reports.' });
  }
});

module.exports = router;
