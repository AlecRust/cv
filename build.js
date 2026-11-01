const postcss = require('postcss')
const fs = require('fs-extra')
const { exec: execCallback } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { promisify } = require('node:util')
const { chromium } = require('@playwright/test')
const exec = promisify(execCallback)

async function copyPublic() {
  try {
    await fs.copy('src/public', 'public')
    await fs.copy('src/resume.json', 'public/alec-rust-cv.json')
    console.log('✅ Public files copied')
  } catch (error) {
    console.error('❌ Error copying public files:', error)
    throw error
  }
}

async function buildHtml() {
  try {
    await exec('npx resume export public/index.html --resume src/resume.json --theme .')
    console.log('✅ HTML built')
  } catch (error) {
    console.error('❌ Error building HTML:', error)
    throw error
  }
}

async function buildStyles() {
  try {
    const inputPath = 'src/styles/style.css'
    const outputPath = 'public/style.min.css'
    const css = await fs.readFile(inputPath, 'utf8')
    const { default: postcssPresetEnv } = await import('postcss-preset-env')
    const { default: cssnano } = await import('cssnano')
    const result = await postcss([
      require('postcss-import'),
      postcssPresetEnv({
        stage: 0,
      }),
      cssnano(),
    ]).process(css, {
      from: inputPath,
      to: outputPath,
    })
    await fs.outputFile(outputPath, result.css)
    console.log('✅ CSS built')
  } catch (error) {
    console.error('❌ Error building CSS:', error)
    throw error
  }
}

async function buildPdf() {
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(pathToFileURL(path.join(__dirname, 'public/index.html')).href, {
      waitUntil: 'networkidle',
    })
    await page.pdf({
      path: 'public/alec-rust-cv.pdf',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    })
    console.log('✅ PDF built')
  } catch (error) {
    console.error('❌ Error building PDF:', error)
    throw error
  } finally {
    await browser?.close()
  }
}

async function watch() {
  const { watch } = await import('chokidar')
  let pending = Promise.resolve()
  console.log('👀 Watching for changes...')
  const watcher = watch('src', { ignoreInitial: true, awaitWriteFinish: true })
  watcher.on('all', (_event, changedPath) => {
    // Serialize builds so rapid edits cannot overwrite newer output with stale files.
    pending = pending
      .then(async () => {
        console.log(`🛠️ Changes detected in ${changedPath}`)
        await buildAssets()
      })
      .catch((error) => {
        console.error('❌ Rebuild failed:', error)
      })
  })
  await new Promise((resolve, reject) => {
    watcher.once('ready', resolve)
    watcher.once('error', reject)
  })
  watcher.on('error', (error) => {
    console.error('❌ Watch error:', error)
    process.exitCode = 1
  })
  return watcher
}

async function buildAssets() {
  console.log('🚀 Building assets...')
  await copyPublic()
  await buildHtml()
  await buildStyles()
  await buildPdf()
  console.log('🎉 Build completed.')
}

async function build() {
  await buildAssets()

  if (process.argv.includes('--watch')) {
    const watcher = await watch()
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, async () => {
        await watcher.close()
      })
    }
  }
}

build().catch((error) => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})
