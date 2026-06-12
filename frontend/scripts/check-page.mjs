import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/'
const errors = []
const logs = []

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()

page.on('console', (msg) => {
  logs.push(`[${msg.type()}] ${msg.text()}`)
})
page.on('pageerror', (err) => {
  errors.push(`PAGEERROR: ${err.message}`)
})
page.on('requestfailed', (req) => {
  errors.push(`REQUESTFAILED: ${req.url()} — ${req.failure()?.errorText}`)
})

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  const rootHtml = await page.locator('#root').innerHTML().catch(() => '')
  const rootText = await page.locator('#root').innerText().catch(() => '')
  const title = await page.title()

  console.log('URL:', url)
  console.log('Title:', title)
  console.log('Root innerHTML length:', rootHtml.length)
  console.log('Root text preview:', rootText.slice(0, 300).replace(/\s+/g, ' ').trim() || '(empty)')
  console.log('--- Errors ---')
  console.log(errors.length ? errors.join('\n') : '(none)')
  console.log('--- Console (last 15) ---')
  console.log(logs.slice(-15).join('\n') || '(none)')
} catch (e) {
  console.error('NAV FAIL:', e.message)
} finally {
  await browser.close()
}
