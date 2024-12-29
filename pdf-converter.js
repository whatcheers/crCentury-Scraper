const { fromPath } = require('pdf2pic');
const fs = require('fs').promises;
const path = require('path');

async function convertPDFToImages(pdfPath) {
    const baseOptions = {
        density: 300,
        saveFilename: path.basename(pdfPath, '.pdf'),
        savePath: path.join(process.cwd(), 'cache'),
        format: 'jpg',
        width: 1200,
        height: 1800
    };

    const convert = fromPath(pdfPath, baseOptions);
    
    try {
        // Create cache directory if it doesn't exist
        await fs.mkdir(baseOptions.savePath, { recursive: true });
        
        // Convert all pages
        const pageToConvertAsImage = await convert.bulk(-1);
        console.log(`Converted ${pageToConvertAsImage.length} pages from ${pdfPath}`);
        
        return pageToConvertAsImage.map(page => ({
            width: page.width,
            height: page.height,
            uri: `/cache/${page.name}`
        }));
    } catch (error) {
        console.error('Error converting PDF:', error);
        throw error;
    }
}

module.exports = { convertPDFToImages }; 