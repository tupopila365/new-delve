import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:5174/'
const errors = []
const logs = []

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()

page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`))

try {
  await page.goto(`${base}login`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('#u', 'demo_user')
  await page.fill('#p', 'demo12345')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2500)

  const errBanner = await page.locator('.error-banner').textContent().catch(() => null)
  const url = page.url()
  const rootText = await page.locator('#root').innerText().catch(() => '')

  console.log('After login URL:', url)
  console.log('Error banner:', errBanner || '(none)')
  console.log('Root preview:', rootText.slice(0, 200).replace(/\s+/g, ' ').trim())
  console.log('--- Errors ---')
  console.log(errors.length ? errors.join('\n') : '(none)')
  console.log('--- Console errors ---')
  console.log(logs.filter((l) => l.includes('[error]')).join('\n') || '(none)')
} catch (e) {
  console.error('FAIL:', e.message)
} finally {
  await browser.close()
}
