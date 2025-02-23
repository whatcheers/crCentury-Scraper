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

    test('gallery page has proper heading structure', async () => {
        const response = await request(app).get('/gallery');
        const { window } = new (require('jsdom')).JSDOM(response.text);
        const headings = Array.from(window.document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(h => ({
                level: parseInt(h.tagName[1]),
                text: h.textContent.trim()
            }));

        expect(headings.length).toBeGreaterThan(0);
        expect(headings[0].level).toBe(1);
        expect(headings[0].text).toBe('Historical Cedar Rapids Photos');
    });

    test('all images have alt text', async () => {
        const response = await request(app).get('/gallery');
        const { window } = new (require('jsdom')).JSDOM(response.text);
        const images = Array.from(window.document.querySelectorAll('img'));
        const allHaveAlt = images.every(img => img.hasAttribute('alt') && img.alt.length > 0);
        expect(allHaveAlt).toBe(true);
    });

    test('ARIA attributes are properly used', async () => {
        const response = await request(app).get('/gallery');
        const { window } = new (require('jsdom')).JSDOM(response.text);
        
        // Check for proper ARIA labels
        const ariaElements = Array.from(window.document.querySelectorAll('[aria-label]'));
        const hasProperLabels = ariaElements.every(el => el.getAttribute('aria-label').length > 0);
        expect(hasProperLabels).toBe(true);

        // Check for proper ARIA roles
        const roleElements = Array.from(window.document.querySelectorAll('[role]'));
        const validRoles = [
            'banner',
            'button',
            'group',
            'img',
            'list',
            'listitem',
            'main',
            'navigation',
            'status',
            'text'
        ];
        const hasProperRoles = roleElements.every(el => 
            validRoles.includes(el.getAttribute('role'))
        );
        expect(hasProperRoles).toBe(true);
    });
}); 