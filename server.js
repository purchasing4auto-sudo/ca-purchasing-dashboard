const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the dist/public directory (where Vite outputs the build)
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// Handle all routes by serving index.html (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
