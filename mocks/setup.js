const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock the process.env variables
process.env.PORT = '3200';
process.env.BASE_PATH = process.cwd();

// Increase timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise
global.console = {
    ...console,
    // Comment these out to see debug logs
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // Keep error logging for debugging
    error: console.error,
    warn: console.warn
};

// Create a minimal window mock for Node environment
if (typeof window === 'undefined') {
    global.window = {
        matchMedia: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }))
    };
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
};

// Mock window.matchMedia
global.matchMedia = global.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
};

// Mock window.scrollTo
global.scrollTo = jest.fn();

// Mock performance.getEntriesByType
if (!global.performance) {
    global.performance = {
        getEntriesByType: () => []
    };
}

// Mock document.elementFromPoint
if (typeof document !== 'undefined') {
    document.elementFromPoint = jest.fn();
} 