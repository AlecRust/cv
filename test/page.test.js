const puppeteer = require('puppeteer')
const path = require('path')

describe('Page Tests', () => {
  let browser
  let page

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: 'new' })
    page = await browser.newPage()
  })

  afterAll(async () => {
    await browser.close()
  })

  beforeEach(async () => {
    await page.goto(
      `file://${path.join(__dirname, '..', '/public/index.html')}`,
      { waitUntil: 'networkidle0' },
    )
  })

  test('renders correctly', async () => {
    const image = await page.screenshot()
    expect(image).toMatchImageSnapshot({
      failureThreshold: 0.03,
      failureThresholdType: 'percent',
    })
  })

  test('dates are formatted correctly', async () => {
    const pageText = await page.evaluate(() => document.body.textContent)
    const normalizedDateText = pageText.replace(/\s+/g, ' ').trim()
    expect(normalizedDateText).toContain('4th Jul 2016 - 30th Jun 2023')
  })

  test('"View as PDF" link loads PDF', async () => {
    await page.click('a[href="alec-rust-cv.pdf"]')
    const contentType = await page.evaluate(() => document.contentType)
    expect(contentType).toBe('application/pdf')
  })
})
