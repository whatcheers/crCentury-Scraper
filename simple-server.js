const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 6969;

// Directory listing endpoint
app.get('/', async (req, res) => {
    try {
        const files = await fs.promises.readdir(__dirname);
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        
        // Create HTML list of PDF files with embedded PDF viewer
        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Gazette Archives</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 2em; }
                        .container { display: flex; }
                        .file-list { width: 300px; padding-right: 20px; }
                        .viewer { flex-grow: 1; }
                        ul { list-style-type: none; padding: 0; }
                        li { margin: 0.5em 0; }
                        a { color: #0066cc; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                        iframe { width: 100%; height: 800px; border: 1px solid #ccc; }
                    </style>
                </head>
                <body>
                    <h1>Gazette Archives</h1>
                    <div class="container">
                        <div class="file-list">
                            <h2>Available PDFs</h2>
                            <ul>
                                ${pdfFiles.map(file => `
                                    <li><a href="/pdf/${file}" target="pdfViewer">${file}</a></li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="viewer">
                            <iframe name="pdfViewer"></iframe>
                        </div>
                    </div>
                </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        res.status(500).send('Error reading directory');
    }
});

// PDF serving endpoint
app.get('/pdf/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // Basic security: prevent directory traversal
    if (!filename.endsWith('.pdf')) {
        return res.status(403).send('Invalid file type');
    }
    
    const filePath = path.join(__dirname, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    
    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
});

app.listen(port, () => {
    console.log(`Gazette viewer running on http://localhost:${port}`);
});
