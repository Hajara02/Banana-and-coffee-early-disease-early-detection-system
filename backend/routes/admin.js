const express = require('express');
const Report = require('../models/Report');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/reports', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    const summary = {
      totalReports: reports.length,
      byCrop: reports.reduce((acc, report) => {
        acc[report.crop] = (acc[report.crop] || 0) + 1;
        return acc;
      }, {}),
      byDisease: reports.reduce((acc, report) => {
        const name = report.outcome?.disease || 'Unknown';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ count: reports.length, summary, reports });
  } catch (error) {
    console.error('Admin report error', error);
    res.status(500).json({ error: 'Unable to load admin reports.' });
  }
});

router.get('/summary', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const reports = await Report.find();
    const total = reports.length;
    const grouped = reports.reduce((acc, report) => {
      const crop = report.crop || 'unknown';
      acc[crop] = (acc[crop] || 0) + 1;
      return acc;
    }, {});
    res.json({ total, grouped });
  } catch (error) {
    console.error('Admin summary error', error);
    res.status(500).json({ error: 'Unable to load admin summary.' });
  }
});

module.exports = router;
