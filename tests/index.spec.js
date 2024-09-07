// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')

test.describe('Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `file://${path.join(__dirname, '..', '/public/index.html')}`,
    )
  })

  test('renders correctly', async ({ page }) => {
    const image = await page.screenshot()
    expect(image).toMatchSnapshot('render-snapshot.png')
  })

  test('dates are formatted correctly', async ({ page }) => {
    const pageText = await page.locator('body').innerText()
    if (pageText) {
      const normalizedDateText = pageText.replace(/\s+/g, ' ').trim()
      expect(normalizedDateText).toContain('4th Jul 2016 - 30th Jun 2023')
    } else {
      throw new Error('Page text is null or undefined.')
    }
  })
})
