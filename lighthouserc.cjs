module.exports = {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:4173/obsidian-bank/login',
        'http://127.0.0.1:4173/obsidian-bank/',
        'http://127.0.0.1:4173/obsidian-bank/cards',
      ],
      numberOfRuns: 3,
      startServerCommand: 'node scripts/lighthouse-preview.mjs',
      startServerReadyPattern: 'Lighthouse servers ready',
      startServerReadyTimeout: 30000,
      puppeteerScript: './scripts/lighthouse-auth.cjs',
      puppeteerLaunchOptions: { args: ['--disable-webgl'] },
      settings: {
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 180000 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
}
