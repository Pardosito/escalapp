const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8080;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.static(__dirname));

app.get('/:page.html', (req, res, next) => {
  const pageName = req.params.page + '.html';
  const rootPath = path.join(__dirname, pageName);
  const htmlFolderPath = path.join(__dirname, 'html', pageName);
  
  if (fs.existsSync(rootPath)) {
    res.sendFile(rootPath);
  } 
  else if (fs.existsSync(htmlFolderPath)) {
    res.sendFile(htmlFolderPath);
  }
  else {
    next();
  }
});

app.get('/', (req, res) => {
  const rootIndexPath = path.join(__dirname, 'index.html');
  const htmlFolderIndexPath = path.join(__dirname, 'html', 'index.html');
  
  if (fs.existsSync(rootIndexPath)) {
    res.sendFile(rootIndexPath);
  } 
  else if (fs.existsSync(htmlFolderIndexPath)) {
    res.sendFile(htmlFolderIndexPath);
  }
  else {
    res.status(404).send('Index file not found. Check your file structure.');
  }
});

app.use((req, res) => {
  console.log(`404 - File not found: ${req.url}`);
  res.status(404).send(`
    <html>
      <head>
        <title>File Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
          .error { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; }
          h1 { color: #721c24; }
          code { background: #f8f9fa; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>404 - File Not Found</h1>
          <p>The requested file <code>${req.url}</code> was not found on the server.</p>
          <p>Check that the file exists in your project directory or in a 'html' subfolder.</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Escalapp frontend server running on http://localhost:${PORT}`);
  console.log(`Project directory: ${__dirname}`);
  console.log(`Press Ctrl+C to stop the server`);
});