const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 6969;

// Basic authentication middleware
app.use(basicAuth({
    users: { 'admin': process.env.API_PASSWORD || 'your-secure-password' },
    challenge: true,
    realm: 'Gazette Archives'
}));

// Directory listing endpoint
app.get('/', async (req, res) => {
    try {
        const files = await fs.promises.readdir(__dirname);
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        
        // Create HTML list of PDF files
        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Gazette Archives</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 2em; }
                        ul { list-style-type: none; padding: 0; }
                        li { margin: 0.5em 0; }
                        a { color: #0066cc; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <h1>Gazette Archives</h1>
                    <ul>
                        ${pdfFiles.map(file => `
                            <li><a href="/pdf/${file}">${file}</a></li>
                        `).join('')}
                    </ul>
                </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        res.status(500).json({ error: 'Error reading directory' });
    }
});

// Secure PDF serving endpoint
app.get('/pdf/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // Prevent directory traversal
    if (filename.includes('..') || !filename.endsWith('.pdf')) {
        return res.status(403).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(__dirname, filename);
    
    // Ensure file exists and is within current directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(__dirname)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
});

app.listen(port, () => {
    console.log(`Gazette API server running on port ${port}`);
}); 