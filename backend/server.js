const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve frontend static files from the frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const reports = [];
const users = {};

function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

function analyzeImage(photoBase64, crop) {
  return {
    prediction: crop === 'banana' ? 'Banana Bacterial Wilt' : 'Coffee Leaf Rust',
    confidence: 0.85,
    modelVersion: 'placeholder-v1',
    note: 'ML model integration pending - using rule-based detection'
  };
}

function analyzeSymptoms(data) {
  const crop = data.crop.toLowerCase();
  const symptoms = data.symptoms || {};
  const score = {
    banana: 0,
    coffee: 0
  };

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
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'auth.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Banana and coffee advisory backend is running.' });
});

app.post('/register', async (req, res) => {
  const { farmerName, phone, password } = req.body;
  if (!farmerName || !phone || !password) {
    return res.status(400).json({ error: 'Farmer name, phone and password are required.' });
  }

  const existingName = Object.values(users).find(u => u.farmerName === farmerName);
  if (existingName) {
    return res.status(409).json({ error: 'Farmer name already registered. Please choose a different name.' });
  }

  const existingUser = Object.values(users).find(u => u.phone === phone);
  if (existingUser) {
    return res.status(409).json({ error: 'Phone number already registered.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateUserId();
    users[userId] = { id: userId, farmerName, phone, passwordHash, createdAt: new Date().toISOString() };
    return res.json({ userId, farmerName, phone, message: 'Registration successful.' });
  } catch (error) {
    console.error('Register error', error);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

app.post('/login', async (req, res) => {
  const { farmerName, password } = req.body;
  if (!farmerName || !password) {
    return res.status(400).json({ error: 'Name and password are required.' });
  }

  const user = Object.values(users).find(u => u.farmerName === farmerName);
  if (!user) {
    return res.status(401).json({ error: 'Invalid name or password.' });
  }

  try {
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid name or password.' });
    }

    return res.json({ userId: user.id, farmerName: user.farmerName, phone: user.phone, message: 'Login successful.' });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

app.post('/report', (req, res) => {
  const data = req.body;

  if (!data || !data.crop || !data.symptoms) {
    return res.status(400).json({ error: 'Crop and symptoms are required.' });
  }

  const result = analyzeSymptoms(data);
  const report = {
    id: reports.length + 1,
    timestamp: new Date().toISOString(),
    farmerName: data.farmerName || 'Unknown',
    phone: data.phone || 'Unknown',
    location: data.location || 'Unknown',
    crop: data.crop,
    symptoms: data.symptoms,
    notes: data.comments || '',
    photoBase64: data.photoBase64 || null,
    gis: data.gis || null,
    userId: data.userId || null,
    mlPrediction: data.photoBase64 ? analyzeImage(data.photoBase64, data.crop) : null,
    outcome: result
  };

  reports.push(report);

  return res.json({ report, advisory: result });
});

app.get('/reports/:userId', (req, res) => {
  const userId = req.params.userId;
  const userReports = reports.filter(r => r.userId === userId);
  res.json({ count: userReports.length, reports: userReports });
});

app.get('/reports', (req, res) => {
  res.json({ count: reports.length, reports });
});

// 404 handler — always return JSON, never HTML
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
