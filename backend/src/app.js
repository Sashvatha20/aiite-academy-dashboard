const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

require('./db');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://aiite-academy-dashboard-frontend.onrender.com',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(helmet());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'AiiTE Academy API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/trainers', require('./routes/trainers'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/students', require('./routes/students'));
app.use('/api/worklog', require('./routes/worklog'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/escalations', require('./routes/escalations'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/student-followups', require('./routes/followups'));
app.use('/api/placements', require('./routes/placements'));
app.use('/api/watercan', require('./routes/watercan'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/mentor-feedback', require('./routes/mentor-feedback'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fee-payments', require('./routes/fee-payments'));
app.use('/api/sheets-sync', require('./routes/sheetSync'));

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err.stack || err.message || err);

  if (err.message && err.message.startsWith('Not allowed by CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Allowed CORS origins:', allowedOrigins);
});