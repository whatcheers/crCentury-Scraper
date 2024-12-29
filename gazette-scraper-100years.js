const puppeteer = require('puppeteer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { fromPath } = require('pdf2pic');

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
 * Convert a single PDF page to image
 * @param {string} pdfPath - Path to the PDF file
 * @param {string} year - Year of the newspaper
 * @param {string} month - Month of the newspaper
 * @param {string} day - Day of the newspaper
 * @param {number} pageNum - Page number
 */
async function convertPageToImage(pdfPath, year, month, day, pageNum) {
    const baseOptions = {
        density: 300,
        saveFilename: `Cedar_Rapids_Evening_Gazette_${year}-${month}-${day}_Page${pageNum}`,
        savePath: path.join(process.cwd(), 'images'),
        format: 'jpg',
        width: 1200,
        height: 1800
    };

    try {
        // Create images directory if it doesn't exist
        await fs.mkdir(baseOptions.savePath, { recursive: true });
        
        const convert = fromPath(pdfPath, baseOptions);
        // Use bulk conversion for a single page
        const result = await convert.bulk(-1, { 
            responseType: "image",
            page: 1  // Convert only first page since each PDF is a single page
        });
        
        safeLog(`Converted page ${pageNum} to image: ${result[0].name}`);
        return result[0];
    } catch (error) {
        safeLog(`Error converting page ${pageNum} to image: ${error.message}`);
        throw error;
    }
}

/**
 * Create dated directory structure
 * @param {string} year
 * @param {string} month
 * @param {string} day
 * @returns {string} Path to dated directory
 */
async function createDatedFolders(year, month, day) {
    const datePath = path.join(process.cwd(), `${year}-${month}-${day}`);
    await fs.mkdir(datePath, { recursive: true });
    await fs.mkdir(path.join(datePath, 'images'), { recursive: true });
    return datePath;
}

/**
 * Convert all PDFs to images
 */
async function convertAllPagesToImages(datePath) {
    try {
        const files = await fs.readdir(datePath);
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        
        safeLog(`Found ${pdfFiles.length} PDFs to convert`);

        // Create images directory if it doesn't exist
        const imagesDir = path.join(datePath, 'images');
        await fs.mkdir(imagesDir, { recursive: true });

        for (const pdfFile of pdfFiles) {
            const pdfPath = path.join(datePath, pdfFile);
            const pageNum = parseInt(pdfFile.match(/page_(\d+)/)[1]);

            const options = {
                density: 600,
                saveFilename: `page_${String(pageNum).padStart(2, '0')}`,
                savePath: imagesDir,
                format: "png",
                width: 2400,
                height: 3600,
                quality: 100
            };

            try {
                const convert = fromPath(pdfPath, options);
                const result = await convert(1);
                
                if (result) {
                    // Rename the file to remove the .1 suffix
                    const oldPath = path.join(imagesDir, `${options.saveFilename}.1.png`);
                    const newPath = path.join(imagesDir, `${options.saveFilename}.png`);
                    await fs.rename(oldPath, newPath);
                    safeLog(`Successfully converted ${pdfFile} to image`);
                } else {
                    safeLog(`Warning: No result returned for ${pdfFile}`);
                }
            } catch (error) {
                safeLog(`Error converting ${pdfFile}: ${error.message}`);
            }
        }
    } catch (error) {
        safeLog(`Error in convertAllPagesToImages: ${error.message}`);
        throw error;
    }
}

/**
 * Get the date for a specific week number
 * @param {number} weekNum - Week number (1-52)
 * @returns {Date} - Date object for the Sunday of that week
 */
function getDateForWeek(weekNum) {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create a date for January 1st of the current year
    const firstDay = new Date(currentYear, 0, 1);
    
    // Find the first Sunday of the year
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() + (7 - firstDay.getDay()));
    
    // Calculate the target Sunday by adding weeks
    const targetSunday = new Date(firstSunday);
    targetSunday.setDate(firstSunday.getDate() + ((weekNum - 1) * 7));
    
    return targetSunday;
}

/**
 * Get current week number (1-52)
 * @returns {number} - Current week number
 */
function getCurrentWeek() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    const pastDays = (today - firstDay) / 86400000;
    return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

/**
 * Parse a day argument in MM-DD format
 * @param {string} dayArg - Day argument in MM-DD format
 * @returns {Object} - Object with month and day numbers
 */
function parseSpecificDay(dayArg) {
    const match = dayArg.match(/^(\d{2})-(\d{2})$/);
    if (!match) {
        throw new Error('Day must be in MM-DD format (e.g., 12-25)');
    }
    
    const month = parseInt(match[1]);
    const day = parseInt(match[2]);
    
    // Validate month and day
    if (month < 1 || month > 12) {
        throw new Error('Month must be between 01 and 12');
    }
    
    // Get the last day of the specified month
    const lastDay = new Date(new Date().getFullYear(), month, 0).getDate();
    if (day < 1 || day > lastDay) {
        throw new Error(`Day must be between 01 and ${String(lastDay).padStart(2, '0')} for month ${String(month).padStart(2, '0')}`);
    }
    
    return { month, day };
}

/**
 * Main function - IIFE to allow async/await
 * Scrapes newspaper pages from 100 years ago today, for a specific week, or for a specific day
 */
(async () => {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let weekArg = args.findIndex(arg => arg.startsWith('--week'));
    let dayArg = args.findIndex(arg => arg.startsWith('--day'));
    let weekNum = null;
    let specificDay = null;

    // Check for mutually exclusive arguments
    if (weekArg !== -1 && dayArg !== -1) {
        console.error('Cannot use both --week and --day arguments together');
        process.exit(1);
    }
    
    if (weekArg !== -1) {
        // Handle week argument (existing code)
        const weekValue = args[weekArg].split('=')[1] || args[weekArg + 1];
        if (weekValue && !isNaN(weekValue)) {
            weekNum = parseInt(weekValue);
            if (weekNum < 1 || weekNum > 52) {
                console.error('Week number must be between 1 and 52');
                process.exit(1);
            }
        } else {
            console.error('Please provide a week number (1-52) with --week argument');
            process.exit(1);
        }
    } else if (dayArg !== -1) {
        // Handle day argument
        const dayValue = args[dayArg].split('=')[1] || args[dayArg + 1];
        if (!dayValue) {
            console.error('Please provide a date in MM-DD format with --day argument');
            process.exit(1);
        }
        
        try {
            specificDay = parseSpecificDay(dayValue);
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }

    // Initialize date
    const today = new Date();
    const startDate = new Date(today);

    if (weekNum !== null) {
        // Use the specified week
        const targetSunday = getDateForWeek(weekNum);
        startDate.setTime(targetSunday.getTime());
    } else if (specificDay !== null) {
        // Use the specified day
        startDate.setMonth(specificDay.month - 1);
        startDate.setDate(specificDay.day);
    } else {
        // Default to current week's Sunday
        const currentWeek = getCurrentWeek();
        const targetSunday = getDateForWeek(currentWeek);
        startDate.setTime(targetSunday.getTime());
    }

    // Create end date for the loop
    const endDate = specificDay !== null ? 
        new Date(startDate.getTime()) : // Same day for specific day
        new Date(startDate.getTime() + (6 * 24 * 60 * 60 * 1000)); // Week range

    // Loop through the day(s)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        try {
            const { month, day, year } = formatDate(d);
            const dateRange = formatDateRange(d);
            const datePath = await createDatedFolders(year, month, day);

            safeLog(`Scraping Cedar Rapids Evening Gazette for ${month}/${day}/${year}`);
            safeLog(`Working directory: ${datePath}`);

            // Setup Puppeteer with download path set to dated folder
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: { width: 2005, height: 1277 }
            });

            const page = await browser.newPage();
            const timeout = 10000;
            page.setDefaultTimeout(timeout);

            // Configure download behavior to use dated folder
            const client = await page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: datePath
            });

            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');

            // Load first page and determine total pages
            safeLog('Loading first page to determine total pages...');
            await page.goto(`https://cedarrapids.advantage-preservation.com/viewer/?k=gazette&i=f&by=${year}&bdd=1920&d=${dateRange}&m=between&ord=k1&fn=evening_gazette_usa_iowa_cedar_rapids_${year}${month}${day}_english_1&df=1&dt=10`, { waitUntil: 'networkidle0', timeout: 30000 });

            const frameHandle = await page.waitForSelector('iframe', { timeout: 30000 });
            const frame = await frameHandle.contentFrame();
            await frame.waitForSelector('#drpGoToPage', { visible: true, timeout: 15000 });

            const totalPages = await getTotalPages(frame);
            safeLog(`Detected ${totalPages} pages for this edition`);

            if (totalPages === 0) {
                throw new Error('Could not determine total pages or no pages found');
            }

            // First: Download all PDFs
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                try {
                    const url = `https://cedarrapids.advantage-preservation.com/viewer/?k=gazette&i=f&by=${year}&bdd=1920&d=${dateRange}&m=between&ord=k1&fn=evening_gazette_usa_iowa_cedar_rapids_${year}${month}${day}_english_${pageNum}&df=1&dt=10`;

                    safeLog(`Downloading page ${pageNum}...`);
                    await page.goto(url);

                    const frameHandle = await page.waitForSelector('iframe', { timeout });
                    const frame = await frameHandle.contentFrame();
                    await frame.waitForSelector('#download', { timeout });
                    
                    // Set up file rename watcher before clicking download
                    const oldPath = path.join(datePath, `Cedar Rapids Evening Gazette, Page${pageNum}, ${year}-${month}-${day}.pdf`);
                    const newPath = path.join(datePath, `page_${String(pageNum).padStart(2, '0')}.pdf`);
                    
                    // Start download
                    await frame.click('#download');
                    
                    // Wait for download to complete
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Rename the file
                    try {
                        await fs.rename(oldPath, newPath);
                        safeLog(`Downloaded and renamed page ${pageNum}`);
                    } catch (error) {
                        safeLog(`Error renaming page ${pageNum}: ${error.message}`);
                    }

                } catch (error) {
                    safeLog(`Error downloading page ${pageNum}: ${error.message}`);
                }
            }

            // Close browser after downloads
            await browser.close();
            safeLog('All PDFs downloaded');

            // Second: Convert all PDFs to images
            safeLog('Converting PDFs to images...');
            await convertAllPagesToImages(datePath);
            safeLog('Finished converting to images');

            // Third: Combine PDFs (modify gazette-combine.js to use dated folder)
            safeLog('Combining PDFs...');
            exec(`node gazette-combine.js "${datePath}"`, (error, stdout, stderr) => {
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
        }
    }
})();