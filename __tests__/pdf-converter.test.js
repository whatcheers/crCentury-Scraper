const { convertPDFToImages } = require('../src/pdf-converter');
const mockFs = require('mock-fs');
const fs = require('fs').promises;
const path = require('path');

jest.mock('pdf2pic', () => ({
    fromPath: jest.fn().mockReturnValue({
        bulk: jest.fn().mockResolvedValue([
            { width: 1200, height: 1800, name: 'test-page-1.jpg' },
            { width: 1200, height: 1800, name: 'test-page-2.jpg' }
        ])
    })
}));

describe('PDF Converter', () => {
    let consoleSpy;
    let consoleLogSpy;

    beforeEach(() => {
        // Mock console methods to avoid Jest console issues
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        // Setup mock filesystem
        mockFs({
            'test.pdf': Buffer.from([]),
            'cache': {}
        });
    });

    afterEach(() => {
        mockFs.restore();
        consoleSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    test('converts PDF to images successfully', async () => {
        const result = await convertPDFToImages('test.pdf');
        
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            width: 1200,
            height: 1800,
            uri: '/cache/test-page-1.jpg'
        });
        expect(result[1]).toEqual({
            width: 1200,
            height: 1800,
            uri: '/cache/test-page-2.jpg'
        });
        
        // Verify console.log was called with success message
        expect(consoleLogSpy).toHaveBeenCalledWith('Converted 2 pages from test.pdf');
    });

    test('creates cache directory if it does not exist', async () => {
        await convertPDFToImages('test.pdf');
        
        const cacheExists = await fs.access(path.join(process.cwd(), 'cache'))
            .then(() => true)
            .catch(() => false);
        
        expect(cacheExists).toBe(true);
    });

    test('handles conversion errors', async () => {
        jest.requireMock('pdf2pic').fromPath.mockReturnValue({
            bulk: jest.fn().mockRejectedValue(new Error('Conversion failed'))
        });

        await expect(convertPDFToImages('test.pdf'))
            .rejects
            .toThrow('Conversion failed');
            
        // Verify console.error was called
        expect(consoleSpy).toHaveBeenCalledWith('Error converting PDF:', expect.any(Error));
    });
}); 