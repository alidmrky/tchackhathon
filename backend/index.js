require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jiraRoutes = require('./routes/jira');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/jira', jiraRoutes);

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);

  if (err.response) {
    return res.status(err.response.status).json({
      error: err.response.data?.errorMessages?.[0] || err.response.data?.message || 'Jira API error',
      details: err.response.data,
    });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
