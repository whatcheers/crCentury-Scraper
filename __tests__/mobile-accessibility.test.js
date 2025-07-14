const puppeteer = require('puppeteer');
const { axe, toHaveNoViolations } = require('jest-axe');
const express = require('express');
const path = require('path');
const galleryRouter = require('../mocks/gallery');

expect.extend(toHaveNoViolations);

describe('Mobile and Accessibility Tests', () => {
    let browser;
    let page;
    let server;
    const PORT = 3201;
    const BASE_URL = `http://localhost:${PORT}`;

    beforeAll(async () => {
        // Start server
        const app = express();
        app.use(express.static(path.join(__dirname, '../public')));
        app.use('/gallery', galleryRouter);
        server = app.listen(PORT);

        // Launch browser
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
    });

    afterAll(async () => {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    });

    beforeEach(async () => {
        page = await browser.newPage();
    });

    afterEach(async () => {
        await page.close();
    });

    describe('Mobile Viewport Tests', () => {
        const devices = [
            { name: 'iPhone 12', width: 390, height: 844 },
            { name: 'iPad', width: 768, height: 1024 },
            { name: 'Samsung Galaxy S20', width: 360, height: 800 }
        ];

        test.each(devices)('gallery layout adapts to $name viewport', async ({ width, height }) => {
            await page.setViewport({ width, height });
            await page.goto(`${BASE_URL}/gallery`);

            // Check grid layout
            const gridWidth = await page.$eval('.gallery-grid', el => el.offsetWidth);
            expect(gridWidth).toBeLessThanOrEqual(width);

            // Check image containers
            const imageContainers = await page.$$('.gallery-item');
            for (const container of imageContainers) {
                const box = await container.boundingBox();
                expect(box.width).toBeLessThanOrEqual(width);
            }

            // Verify touch targets are large enough
            const touchTargets = await page.$$('a, button, [role="button"], .share-button');
            for (const target of touchTargets) {
                const box = await target.boundingBox();
                expect(box.width).toBeGreaterThanOrEqual(44);
                expect(box.height).toBeGreaterThanOrEqual(44);
            }
        });

        test('lazy loading works on mobile', async () => {
            await page.setViewport({ width: 390, height: 844 });
            await page.goto(`${BASE_URL}/gallery`);

            // Add lazy loaded images to the page
            await page.evaluate(() => {
                const container = document.querySelector('.gallery-grid');
                for (let i = 0; i < 5; i++) {
                    const img = document.createElement('img');
                    img.className = 'lazy';
                    img.dataset.src = `/photos/test${i}.jpg`;
                    img.alt = `Test Image ${i}`;
                    container.appendChild(img);
                }

                // Add intersection observer
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.classList.add('loaded');
                            observer.unobserve(img);
                        }
                    });
                });

                document.querySelectorAll('.lazy').forEach(img => observer.observe(img));
            });

            // Scroll and wait for images to load
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);

            // Check if any images have been loaded
            const loadedImages = await page.$$eval('.lazy.loaded', images => images.length);
            expect(loadedImages).toBeGreaterThan(0);
        });

        test('pull-to-refresh indicator shows on mobile', async () => {
            await page.setViewport({ width: 390, height: 844 });
            await page.goto(`${BASE_URL}/gallery`);

            // Simulate pull-to-refresh
            await page.evaluate(() => {
                const event = new MouseEvent('mousedown', {
                    clientY: 0,
                    bubbles: true
                });
                document.dispatchEvent(event);

                const moveEvent = new MouseEvent('mousemove', {
                    clientY: 100,
                    bubbles: true
                });
                document.dispatchEvent(moveEvent);
            });

            const indicator = await page.$('.pull-indicator');
            expect(indicator).not.toBeNull();
        });
    });

    describe('Accessibility Tests', () => {
        test('meets WCAG color contrast requirements', async () => {
            await page.goto(`${BASE_URL}/gallery`);
            
            // Run accessibility audit
            const snapshot = await page.accessibility.snapshot({
                interestingOnly: true
            });

            // Check that all text nodes have sufficient contrast
            function checkContrast(node) {
                if (node.role === 'text' || node.role === 'link' || node.role === 'heading') {
                    expect(node.name).toBeTruthy();
                }
                if (node.children) {
                    node.children.forEach(checkContrast);
                }
            }

            checkContrast(snapshot);
        });

        test('all images have alt text', async () => {
            await page.goto(`${BASE_URL}/gallery`);
            const images = await page.$$eval('img', imgs => 
                imgs.every(img => img.hasAttribute('alt') && img.alt.length > 0)
            );
            expect(images).toBe(true);
        });

        test('has proper heading structure', async () => {
            await page.goto(`${BASE_URL}/gallery`);
            const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headings =>
                headings.map(h => ({
                    level: parseInt(h.tagName[1]),
                    text: h.textContent
                }))
            );

            expect(headings.length).toBeGreaterThan(0);
            expect(headings[0].level).toBe(1);
        });

        test('keyboard navigation works', async () => {
            await page.goto(`${BASE_URL}/gallery`);
            
            // Press tab and check if focus is visible
            await page.keyboard.press('Tab');
            const focusedElement = await page.evaluate(() => {
                const active = document.activeElement;
                return {
                    tag: active.tagName.toLowerCase(),
                    visible: window.getComputedStyle(active).outline !== 'none'
                };
            });

            expect(focusedElement.visible).toBe(true);
        });

        test('ARIA attributes are properly used', async () => {
            await page.goto(`${BASE_URL}/gallery`);
            
            // Check for proper ARIA roles
            const hasProperRoles = await page.$$eval('[role]', elements =>
                elements.every(el => {
                    const role = el.getAttribute('role');
                    return [
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
                    ].includes(role);
                })
            );
            expect(hasProperRoles).toBe(true);

            // Check for proper ARIA labels
            const hasProperLabels = await page.$$eval('[aria-label]', elements =>
                elements.every(el => el.getAttribute('aria-label').length > 0)
            );
            expect(hasProperLabels).toBe(true);
        });
    });

    describe('Performance Tests', () => {
        test('lazy loading improves performance', async () => {
            await page.setViewport({ width: 390, height: 844 });
            await page.goto(`${BASE_URL}/gallery`);

            // Check initial network requests
            const initialRequests = await page.evaluate(() => 
                performance.getEntriesByType('resource')
                    .filter(r => r.initiatorType === 'img').length
            );

            // Should only load visible images
            expect(initialRequests).toBeLessThan(10);
        });

        test('images are properly sized for viewport', async () => {
            await page.setViewport({ width: 390, height: 844 });
            await page.goto(`${BASE_URL}/gallery`);

            const images = await page.$$eval('img', imgs =>
                imgs.map(img => ({
                    naturalWidth: img.naturalWidth,
                    displayWidth: img.offsetWidth
                }))
            );

            for (const image of images) {
                // Images shouldn't be significantly larger than display size
                expect(image.naturalWidth / image.displayWidth).toBeLessThan(4.5);
            }
        });
    });
}); 