const postcss = require('postcss')
const fs = require('fs-extra')
const chokidar = require('chokidar')
const { exec } = require('child_process')
const puppeteer = require('puppeteer')
const htmlMinifier = require('html-minifier').minify

const paths = {
  resume: 'src/resume.json',
  styles: 'src/styles/**/*.css',
}

async function styles() {
  const inputPath = 'src/styles/style.css'
  const outputPath = 'public/style.min.css'
  try {
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
    console.log(`✅ CSS built`)
  } catch (error) {
    console.error('❌ Error processing CSS:', error)
    process.exit(1)
  }
}

function buildHtml() {
  return new Promise((resolve, reject) => {
    exec(
      'npx resume export public/index.html --resume src/resume.json --theme .',
      function (err, stdout, stderr) {
        if (err) {
          console.error('Error exporting HTML with resume-cli:', err)
          console.error(stderr)
          reject(err)
        }
        console.log('✅ HTML exported')
        resolve()
      },
    )
  })
}

async function buildPdf() {
  const browser = await puppeteer.launch({
    headless: 'new',
  })
  const page = await browser.newPage()
  await page.goto(`file://${__dirname}/public/index.html`, {
    waitUntil: 'networkidle0',
  })
  await page.pdf({
    path: 'public/alec-rust-cv.pdf',
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm',
    },
  })
  await browser.close()
  console.log('✅ PDF generated')
}

async function minifyHtml() {
  const inputPath = 'public/index.html'
  try {
    const html = await fs.readFile(inputPath, 'utf8')
    const minified = htmlMinifier(html, {
      caseSensitive: true,
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      minifyJS: true,
      removeAttributeQuotes: true,
      removeComments: true,
      removeOptionalTags: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
    })
    await fs.outputFile(inputPath, minified)
    console.log(`✅ HTML minified`)
  } catch (error) {
    console.error('❌ Error minifying HTML:', error)
    process.exit(1)
  }
}

async function copyResumeJson() {
  try {
    await fs.copy(paths.resume, 'public/alec-rust-cv.json')
    console.log('✅ JSON copied')
  } catch (error) {
    console.error('❌ Error copying JSON:', error)
    process.exit(1)
  }
}

async function copyPublic() {
  try {
    await fs.copy('src/public', 'public')
    console.log('✅ Public assets copied')
  } catch (error) {
    console.error('❌ Error copying public assets:', error)
    process.exit(1)
  }
}

function watch() {
  console.log('👀 Watching for changes...')

  chokidar
    .watch(paths.styles, { ignoreInitial: true })
    .on('all', async (event, path) => {
      console.log(`Changes detected in styles: ${path}`)
      await styles()
    })

  chokidar.watch(paths.resume, { ignoreInitial: true }).on('all', async () => {
    console.log('Changes detected in resume.json')
    await copyResumeJson()
  })
}

async function build() {
  console.log('🚀 Building assets...')
  await styles()
  await copyResumeJson()
  await copyPublic()
  await buildHtml()
  await buildPdf()
  await minifyHtml()
  console.log('🎉 Build completed.')

  if (process.argv.includes('--watch')) {
    watch()
  } else {
    process.exit()
  }
}

build()
