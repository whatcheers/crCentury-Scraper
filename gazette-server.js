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

// Endpoint to get PDF by date
app.get('/gazette/:date', (req, res) => {
    const date = req.params.date; // Expected format: YYYY-MM-DD
    const pdfPath = path.join(__dirname, `Cedar_Rapids_Evening_Gazette_${date}_Complete.pdf`);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({ error: 'PDF not found for this date' });
    }

    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gazette-${date}.pdf"`);
    res.sendFile(pdfPath);
});

app.listen(port, () => {
    console.log(`Gazette API server running on port ${port}`);
}); 