const config = {
  setupFilesAfterEnv: ['./jest.setup.js'],
}

if (process.env.CI) {
  config.reporters = [['github-actions', { silent: false }], 'summary']
}

module.exports = config
