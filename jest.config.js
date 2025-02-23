module.exports = {
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^../src/(.*)$': '<rootDir>/src/$1'
    },
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    collectCoverage: true,
    coverageReporters: ['text', 'lcov'],
    coverageDirectory: 'coverage',
    testEnvironmentOptions: {
        url: 'http://localhost:3202'
    },
    projects: [
        {
            displayName: 'accessibility',
            testMatch: ['<rootDir>/__tests__/accessibility.test.js'],
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/mocks/setup.js']
        },
        {
            displayName: 'default',
            testMatch: ['<rootDir>/__tests__/!(accessibility).test.js'],
            testEnvironment: 'node'
        }
    ]
}; 