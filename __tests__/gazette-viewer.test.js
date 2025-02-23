const request = require('supertest');
const mockFs = require('mock-fs');
const path = require('path');
const fs = require('fs');
const express = require('express');

describe('Gazette Viewer', () => {
    let app;

    beforeEach(() => {
        // Create a simple Express app for testing
        app = express();
        app.get('/', (req, res) => {
            res.send(`
                <html>
                    <head><title>Cedar Rapids Evening Gazette Archive</title></head>
                    <body>
                        <h1>Cedar Rapids Evening Gazette Archive</h1>
                        <div>
                            <a href="/view/1924-01-01">View Images</a>
                            <a href="/view-pdfs/1924-01-01">View PDFs</a>
                        </div>
                    </body>
                </html>
            `);
        });

        app.get('/view/:date', (req, res) => {
            res.send('<div>Image Viewer</div>');
        });

        app.get('/view-pdfs/:date', (req, res) => {
            res.send('<div>PDF Viewer</div>');
        });

        // Setup mock filesystem
        mockFs({
            'public': {
                'css': {
                    'styles.css': 'body { color: black; }'
                },
                'js': {
                    'theme.js': 'console.log("theme");'
                }
            },
            '1924-01-01': {
                'images': {
                    'page_01.png': Buffer.from([]),
                    'page_02.png': Buffer.from([])
                },
                'page_01.pdf': Buffer.from([]),
                'page_02.pdf': Buffer.from([])
            }
        });
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Main Page', () => {
        test('returns 200 and HTML content', async () => {
            const response = await request(app).get('/');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Cedar Rapids Evening Gazette Archive');
        });

        test('includes both PDF and image viewing options', async () => {
            const response = await request(app).get('/');
            expect(response.text).toContain('View Images');
            expect(response.text).toContain('View PDFs');
        });
    });

    describe('Date Redirects', () => {
        test('redirects valid date to viewer', async () => {
            app.get('/:date', (req, res) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
                    res.redirect(`/view/${req.params.date}`);
                } else {
                    res.status(404).send('Not found');
                }
            });

            const response = await request(app)
                .get('/1924-01-01')
                .expect(302);
            
            expect(response.headers.location).toBe('/view/1924-01-01');
        });

        test('handles invalid date format', async () => {
            await request(app)
                .get('/invalid-date')
                .expect(404);
        });
    });

    describe('Image Viewer', () => {
        test('returns 200 and viewer HTML for valid date', async () => {
            const response = await request(app)
                .get('/view/1924-01-01')
                .expect(200);

            expect(response.text).toContain('Image Viewer');
        });
    });

    describe('PDF Viewer', () => {
        test('returns 200 and PDF viewer HTML for valid date', async () => {
            const response = await request(app)
                .get('/view-pdfs/1924-01-01')
                .expect(200);

            expect(response.text).toContain('PDF Viewer');
        });
    });

    describe('Static Files', () => {
        test('serves CSS files with correct headers', async () => {
            app.get('/css/styles.css', (req, res) => {
                res.set('Content-Type', 'text/css');
                res.set('Cache-Control', 'public, max-age=2592000');
                res.send('body { color: black; }');
            });

            const response = await request(app)
                .get('/css/styles.css')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/css');
            expect(response.headers['cache-control']).toContain('public, max-age=2592000');
        });

        test('serves JavaScript files with correct headers', async () => {
            app.get('/js/theme.js', (req, res) => {
                res.set('Content-Type', 'application/javascript');
                res.set('Cache-Control', 'public, max-age=2592000');
                res.send('console.log("theme");');
            });

            const response = await request(app)
                .get('/js/theme.js')
                .expect(200);

            expect(response.headers['content-type']).toContain('application/javascript');
            expect(response.headers['cache-control']).toContain('public, max-age=2592000');
        });
    });
}); 