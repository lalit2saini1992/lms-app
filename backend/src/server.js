require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'https://onlytest.in',
      'https://www.onlytest.in',
      'http://onlytest.in',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    // Allow if origin is in list OR no origin (mobile apps, Postman)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      // Also allow if CLIENT_URL env matches
      const envUrls = (process.env.CLIENT_URL || '').split(',').map(u => u.trim());
      if (envUrls.includes(origin)) {
        callback(null, true);
      } else {
        console.log('CORS blocked:', origin);
        callback(null, true); // Allow all for now — tighten later
      }
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/leads',       require('./routes/leads'));
app.use('/api/followups',   require('./routes/followups'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/profile',     require('./routes/profile'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
