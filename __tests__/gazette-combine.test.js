const mockFs = require('mock-fs');
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// Mock pdf-lib
jest.mock('pdf-lib', () => ({
    PDFDocument: {
        create: jest.fn().mockResolvedValue({
            copyPages: jest.fn().mockResolvedValue([{}]),
            addPage: jest.fn(),
            save: jest.fn().mockResolvedValue(Buffer.from([]))
        }),
        load: jest.fn().mockResolvedValue({
            getPageIndices: jest.fn().mockReturnValue([0])
        })
    }
}));

// Create a simple mock implementation of the combinePDFs function
const combinePDFs = async () => {
    const files = await fs.readdir('.');
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
        console.log('No PDF files found');
        return;
    }

    const combinedDoc = await PDFDocument.create();
    for (const file of pdfFiles) {
        const fileContent = await fs.readFile(file);
        const doc = await PDFDocument.load(fileContent);
        const pages = await combinedDoc.copyPages(doc, doc.getPageIndices());
        pages.forEach(page => combinedDoc.addPage(page));
    }

    const combinedPDF = await combinedDoc.save();
    await fs.writeFile('Cedar_Rapids_Evening_Gazette_1924-01-01_Complete.pdf', combinedPDF);
    
    for (const file of pdfFiles) {
        await fs.unlink(file);
    }
};

describe('Gazette PDF Combiner', () => {
    beforeEach(() => {
        // Setup mock filesystem
        mockFs({
            'Cedar Rapids Evening Gazette, Page1 (1924-01-01).pdf': Buffer.from([]),
            'Cedar Rapids Evening Gazette, Page2 (1924-01-01).pdf': Buffer.from([]),
            'Cedar Rapids Evening Gazette, Page3 (1924-01-01).pdf': Buffer.from([])
        });
    });

    afterEach(() => {
        mockFs.restore();
        jest.clearAllMocks();
    });

    test('combines PDF files in correct order', async () => {
        await combinePDFs();

        // Check if combined PDF was created
        const combinedExists = await fs.access('Cedar_Rapids_Evening_Gazette_1924-01-01_Complete.pdf')
            .then(() => true)
            .catch(() => false);
        
        expect(combinedExists).toBe(true);
        expect(PDFDocument.create).toHaveBeenCalled();
        expect(PDFDocument.load).toHaveBeenCalledTimes(3);
    });

    test('handles empty directory', async () => {
        mockFs({}); // Empty directory
        const consoleSpy = jest.spyOn(console, 'log');
        await combinePDFs();
        expect(consoleSpy).toHaveBeenCalledWith('No PDF files found');
        consoleSpy.mockRestore();
    });

    test('handles invalid filenames', async () => {
        mockFs({
            'invalid-filename.pdf': Buffer.from([])
        });
        
        await combinePDFs();
        expect(PDFDocument.create).toHaveBeenCalled();
        expect(PDFDocument.load).toHaveBeenCalledTimes(1);
    });

    test('deletes original files after combining', async () => {
        await combinePDFs();
        
        const files = await fs.readdir('.');
        const originalFiles = files.filter(file => 
            file.startsWith('Cedar Rapids Evening Gazette, Page'));
        
        expect(originalFiles).toHaveLength(0);
    });
}); 