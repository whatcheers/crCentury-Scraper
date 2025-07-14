const { axe, toHaveNoViolations } = require('jest-axe');
const express = require('express');
const path = require('path');
const galleryRouter = require('../mocks/gallery');
const request = require('supertest');

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
    let app;
    let server;
    const PORT = 3202;

    beforeAll(() => {
        // Create Express app
        app = express();
        app.use(express.static(path.join(__dirname, '../public')));
        app.use('/gallery', galleryRouter);
        
        // Start server
        server = app.listen(PORT);
    });

    afterAll(done => {
        server.close(done);
    });

    test('gallery page meets WCAG requirements', async () => {
        const response = await request(app).get('/gallery');
        const results = await axe(response.text, {
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa']
            }
        });
        expect(results).toHaveNoViolations();
    });
}); 