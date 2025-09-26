const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle the callback route (just serve the same HTML page)
app.get('/callback', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Frontend server running on http://localhost:${PORT}`);
});