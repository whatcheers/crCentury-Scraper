const puppeteer = require('puppeteer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

/**
 * Format date for filename and URL
 * @param {Date} date - The date to format
 */
function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear() - 100; // 100 years ago
    return { month, day, year };
}

/**
 * Format date range for URL
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date range (e.g., "11091924-11111924")
 */
function formatDateRange(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear() - 100;
    
    // Create a range that includes the day before and after
    const prevDay = String(date.getDate() - 1).padStart(2, '0');
    const nextDay = String(date.getDate() + 1).padStart(2, '0');
    
    return `${month}${prevDay}${year}-${month}${nextDay}${year}`;
}

/**
 * Safely log messages by removing non-ASCII characters
 * @param {string} message - The message to log
 */
function safeLog(message) {
    console.log(`[${new Date().toISOString()}] ${message.replace(/[^\x00-\x7F]/g, "")}`);
}

/**
 * Get total pages for a given date
 * @param {Object} frame - Puppeteer frame object
 * @returns {Promise<number>} - Total number of pages
 */
async function getTotalPages(frame) {
    try {
        // Wait for the iframe content to load
        await frame.waitForSelector('#drpGoToPage', { 
            timeout: 15000,
            visible: true 
        });
        
        // Get the total pages from the dropdown
        const totalPages = await frame.evaluate(() => {
            const dropdown = document.querySelector('#drpGoToPage');
            const options = Array.from(dropdown.options);
            // Extract the total pages from the "X/Y" format in the last option
            const lastOption = options[options.length - 1];
            const match = lastOption.text.match(/\d+\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });

        safeLog(`Found dropdown with ${totalPages} pages`);
        return totalPages;
    } catch (error) {
        safeLog(`Error getting total pages: ${error.message}`);
        throw error;
    }
}

/**
 * Get dates for the week
 * @param {Date} date - Starting date
 * @returns {Date[]} - Array of dates for the week
 */
function getWeekDates(date) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + i);
        dates.push(newDate);
    }
    return dates;
}

/**
 * Main function - IIFE to allow async/await
 * Scrapes newspaper pages from 100 years ago today or for a week if --week argument is provided
 */
(async () => {
    // Check for --week argument
    const args = process.argv.slice(2);
    const scrapeWeek = args.includes('--week');

    // Initialize date
    const today = new Date();
    const startDate = new Date(today);

    if (scrapeWeek) {
        // Calculate the offset needed to get to the previous Sunday
        const currentDay = today.getDay();
        // Get to the previous Sunday (no need for century offset here)
        const daysToSubtract = currentDay;
        startDate.setDate(today.getDate() - daysToSubtract);
    }

    // Create end date for the loop
    const endDate = scrapeWeek ? 
        new Date(startDate.getTime() + (6 * 24 * 60 * 60 * 1000)) : // 6 days after start
        new Date(today);

    // Loop through each day of the week if --week is provided, otherwise just today
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const { month, day, year } = formatDate(d);
        const dateRange = formatDateRange(d);

        safeLog(`Scraping Cedar Rapids Evening Gazette for ${month}/${day}/${year}`);
        safeLog(`Date range for URL: ${dateRange}`);

        // Construct initial URL for first page
        const firstUrl = `https://cedarrapids.advantage-preservation.com/viewer/?k=gazette&i=f&by=${year}&bdd=1920&d=${dateRange}&m=between&ord=k1&fn=evening_gazette_usa_iowa_cedar_rapids_${year}${month}${day}_english_1&df=1&dt=10`;
        safeLog(`Initial URL: ${firstUrl}`);

        safeLog('Initializing browser...');

        // Setup Puppeteer with specific configurations
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 2005, height: 1277 }
        });

        const page = await browser.newPage();
        const timeout = 10000;
        page.setDefaultTimeout(timeout);

        // Configure download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve('./')
        });

        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');

        try {
            // Load first page and determine total pages
            safeLog('Loading first page to determine total pages...');
            await page.goto(firstUrl, { waitUntil: 'networkidle0', timeout: 30000 });

            const frameHandle = await page.waitForSelector('iframe', { timeout: 30000 });
            const frame = await frameHandle.contentFrame();
            await frame.waitForSelector('#drpGoToPage', { visible: true, timeout: 15000 });

            const totalPages = await getTotalPages(frame);
            safeLog(`Detected ${totalPages} pages for this edition`);

            if (totalPages === 0) {
                throw new Error('Could not determine total pages or no pages found');
            }

            // Download each page
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                try {
                    const url = `https://cedarrapids.advantage-preservation.com/viewer/?k=gazette&i=f&by=${year}&bdd=1920&d=${dateRange}&m=between&ord=k1&fn=evening_gazette_usa_iowa_cedar_rapids_${year}${month}${day}_english_${pageNum}&df=1&dt=10`;

                    safeLog(`Page ${pageNum} URL: ${url}`);
                    await page.goto(url);

                    const frameHandle = await page.waitForSelector('iframe', { timeout });
                    const frame = await frameHandle.contentFrame();
                    safeLog('Found iframe');

                    await frame.waitForSelector('#download', { timeout });
                    safeLog('Page loaded, clicking download');

                    await frame.click('#download');
                    safeLog(`Downloaded PDF from page ${pageNum}`);

                    // Wait for download to complete
                    await new Promise(resolve => setTimeout(resolve, 3000));

                } catch (error) {
                    safeLog(`Error on page ${pageNum}: ${error.message}`);
                }
            }

            // Combine PDFs using gazette-combine.js
            safeLog('Combining PDFs...');
            exec('node gazette-combine.js', (error, stdout, stderr) => {
                if (error) {
                    safeLog(`Error combining PDFs: ${error.message}`);
                    return;
                }
                if (stderr) {
                    safeLog(`stderr: ${stderr}`);
                    return;
                }
                safeLog(`stdout: ${stdout}`);
            });

        } catch (error) {
            safeLog(`Fatal error: ${error.message}`);
        } finally {
            safeLog('Closing browser');
            await browser.close();
            safeLog('Script completed');
        }
    }
})();