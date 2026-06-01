const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { farmerName, phone, password } = req.body;
  if (!farmerName || !phone || !password) {
    return res.status(400).json({ error: 'Farmer name, phone and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ farmerName, phone, password: passwordHash });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '7d' });

    return res.json({ userId: user.id, farmerName: user.farmerName, token });
  } catch (error) {
    console.error('Register error', error);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required.' });
  }

  try {
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ error: 'Invalid phone or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid phone or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '7d' });
    return res.json({ userId: user.id, farmerName: user.farmerName, token });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const { id, farmerName, phone, role } = req.user;
  return res.json({ userId: id, farmerName, phone, role });
});

module.exports = router;
