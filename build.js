const postcss = require('postcss')
const fs = require('fs-extra')
const chokidar = require('chokidar')
const { exec: execCallback } = require('node:child_process')
const util = require('node:util')
const exec = util.promisify(execCallback)
const playwright = require('playwright')
const { glob } = require('glob')

async function copyPublic() {
  try {
    await fs.copy('src/public', 'public')
    await fs.copy('src/resume.json', 'public/alec-rust-cv.json')
    console.log('✅ Public files copied')
  } catch (error) {
    console.error('❌ Error copying public files:', error)
    process.exit(1)
  }
}

async function buildHtml() {
  try {
    await exec(
      'npx resume export public/index.html --resume src/resume.json --theme .',
    )
    console.log('✅ HTML built')
  } catch (error) {
    console.error('❌ Error building HTML:', error)
    process.exit(1)
  }
}

async function buildStyles() {
  try {
    const inputPath = 'src/styles/style.css'
    const outputPath = 'public/style.min.css'
    const css = await fs.readFile(inputPath, 'utf8')
    const result = await postcss([
      require('postcss-import'),
      require('postcss-preset-env')({
        stage: 0,
      }),
      require('cssnano'),
    ]).process(css, {
      from: inputPath,
      to: outputPath,
    })
    await fs.outputFile(outputPath, result.css)
    console.log('✅ CSS built')
  } catch (error) {
    console.error('❌ Error building CSS:', error)
    process.exit(1)
  }
}

async function buildPdf() {
  try {
    const browser = await playwright.chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(`file://${__dirname}/public/index.html`, {
      waitUntil: 'networkidle',
    })
    await page.pdf({
      path: 'public/alec-rust-cv.pdf',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    })
    await browser.close()
    console.log('✅ PDF built')
  } catch (error) {
    console.error('❌ Error building PDF:', error)
    process.exit(1)
  }
}

async function watch() {
  console.log('👀 Watching for changes...')
  chokidar
    .watch(await glob('src/styles/**/*.css'), { ignoreInitial: true })
    .on('all', async (event, path) => {
      console.log(`🛠️ Changes detected in ${path}`)
      await buildStyles()
    })
  chokidar
    .watch('src/resume.json', { ignoreInitial: true })
    .on('all', async (event, path) => {
      console.log(`🛠️ Changes detected in ${path}`)
      await copyPublic()
    })
}

async function build() {
  console.log('🚀 Building assets...')
  await copyPublic()
  await buildHtml()
  await buildStyles()
  await buildPdf()
  console.log('🎉 Build completed.')

  if (process.argv.includes('--watch')) {
    await watch()
  } else {
    process.exit()
  }
}

build()
