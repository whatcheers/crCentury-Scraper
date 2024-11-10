const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const path = require('path');

async function combinePDFs() {
    try {
        // Get all PDF files in current directory
        const files = (await fs.readdir('./')).filter(f => 
            f.startsWith('Cedar Rapids Evening Gazette, Page') && f.endsWith('.pdf')
        ).sort((a, b) => {
            // Extract page numbers and sort numerically
            const pageA = parseInt(a.match(/Page(\d+)/)[1]);
            const pageB = parseInt(b.match(/Page(\d+)/)[1]);
            return pageA - pageB;
        });

        if (files.length === 0) return;

        // Extract date from first file (they all should have same date)
        const dateMatch = files[0].match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) {
            throw new Error('Could not extract date from filename');
        }
        const [_, year, month, day] = dateMatch;
        
        console.log(`Starting PDF combination process for ${month}/${day}/${year}...`);
        console.log(`Found ${files.length} PDF files to combine`);

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

        // Combine PDFs
        for (const file of files) {
            console.log(`Processing: ${file}`);
            const pdfBytes = await fs.readFile(file);
            const pdf = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        // Save with exact same naming format
        const mergedPdfFile = `Cedar_Rapids_Evening_Gazette_${year}-${month}-${day}_Complete.pdf`;
        const pdfBytes = await mergedPdf.save();
        await fs.writeFile(mergedPdfFile, pdfBytes);
        console.log(`Combined PDF saved as: ${mergedPdfFile}`);

        // Delete individual PDF files
        for (const file of files) {
            await fs.unlink(file);
            console.log(`Deleted: ${file}`);
        }

        console.log('PDF combination completed successfully');

    } catch (error) {
        console.error('Error combining PDFs:', error);
    }
}

combinePDFs(); 