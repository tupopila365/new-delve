import { chromium } from 'playwright'

const base = new URL(process.argv[2] || 'http://127.0.0.1:5173/')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const pageErrors = []
const failedApiRequests = []
const browserErrors = []
const failedRequests = []

page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text())
})
page.on('requestfailed', (request) => {
  failedRequests.push(`${request.failure()?.errorText || 'failed'} ${request.url()}`)
})
page.on('response', (response) => {
  const url = new URL(response.url())
  if (url.origin === base.origin && url.pathname.startsWith('/api/') && response.status() >= 500) {
    failedApiRequests.push(`${response.status()} ${url.pathname}`)
  }
})

function appUrl(path) {
  return new URL(path.replace(/^\//, ''), base).toString()
}

async function navigateInApp(path) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

async function signIn(username) {
  await page.context().clearCookies()
  await page.goto(appUrl('/login'), { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#auth-login-identifier').fill(username)
  await page.locator('#auth-login-password').fill('demo12345')
  await Promise.all([
    page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ])
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('delve_mock_state_v9')
    return Boolean(raw && JSON.parse(raw).currentUser)
  })
  await page.waitForTimeout(500)
}

try {
  const listingName = 'Stay Admin smoke property'
  const roomName = 'Smoke garden room'
  const editedRoomName = 'Smoke garden suite'

  await signIn('food_mgr')
  console.log('Authenticated empty provider')
  await navigateInApp('/provider/stays/new')
  await page.getByRole('heading', { name: 'New accommodation' }).waitFor()

  await page.getByLabel('Property name').fill(listingName)
  await page.getByLabel('Description').fill('A draft property created by the Stay Admin smoke check.')
  await page.getByLabel(/From price per night/).fill('900')
  await page.getByRole('button', { name: 'Edit address details' }).click()
  await page.getByLabel('Region').fill('Khomas')
  await page.getByLabel('City').fill('Windhoek')

  await Promise.all([
    page.waitForURL((url) => url.pathname === '/provider/stays', { timeout: 15_000 }),
    page.getByRole('button', { name: 'Save draft & exit' }).click(),
  ])
  console.log('Created accommodation draft')
  const listingCard = page.locator('.stay-card', { hasText: listingName })
  await listingCard.waitFor()

  await listingCard.getByRole('link', { name: /accommodation/i }).click()
  await page.getByRole('heading', { name: 'Accommodation details' }).waitFor()
  await page.getByRole('button', { name: /Basics/ }).click()
  await page
    .getByLabel('Description')
    .fill('A draft property created and edited by the Stay Admin smoke check.')
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/provider/stays', { timeout: 15_000 }),
    page.getByRole('button', { name: 'Save & exit' }).click(),
  ])
  console.log('Edited accommodation')

  const editedListingCard = page.locator('.stay-card', { hasText: listingName })
  await editedListingCard.getByRole('link', { name: /rooms/i }).click()
  await page.getByRole('heading', { name: 'Rooms' }).waitFor()
  await page.getByRole('link', { name: 'Add room' }).click()
  await page.getByLabel('Room name').fill(roomName)
  await page.getByLabel('Description').fill('Temporary room used to verify room CRUD.')
  await page.getByLabel('Price guests pay / night').fill('980')
  await page.getByRole('button', { name: 'Add room' }).click()

  let roomCard = page.locator('.stay-room-card', { hasText: roomName })
  await roomCard.waitFor()
  console.log('Added room')
  await roomCard.getByRole('link', { name: 'Edit room' }).click()
  await page.getByLabel('Room name').fill(editedRoomName)
  await page.getByRole('button', { name: 'Save room' }).click()

  roomCard = page.locator('.stay-room-card', { hasText: editedRoomName })
  await roomCard.waitFor()
  console.log('Edited room')
  page.once('dialog', (dialog) => dialog.accept())
  await roomCard.getByRole('button', { name: 'Remove' }).click()
  await roomCard.waitFor({ state: 'detached' })
  console.log('Removed room')

  await navigateInApp('/provider/stays')
  const previewCard = page.locator('.stay-card', { hasText: listingName })
  await previewCard.getByRole('link', { name: 'Preview' }).click()
  await page.waitForURL((url) => url.searchParams.get('preview') === '1')
  await page.getByText(listingName, { exact: true }).first().waitFor()
  console.log('Previewed draft')

  await signIn('stays_host')
  await navigateInApp('/provider/stays?tab=bookings')
  await page.getByRole('button', { name: /^Bookings/ }).click()
  const bookingCard = page.locator('.prov-ui__booking', { hasText: 'Freesia Hotel' })
  await bookingCard.waitFor()
  const actionResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/accommodation/provider-bookings/1/check_in/') &&
      response.request().method() === 'POST',
  )
  await bookingCard.getByRole('button', { name: 'Check in' }).click()
  const response = await actionResponse
  if (!response.ok()) throw new Error(`Booking action returned ${response.status()}`)
  console.log('Managed booking')

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`)
  if (failedApiRequests.length) {
    throw new Error(`Failed API requests: ${failedApiRequests.join(' | ')}`)
  }

  console.log('PASS: create, edit, room CRUD, draft preview, and booking management')
} catch (error) {
  const rootText = await page.locator('#root').innerText().catch(() => '')
  const authState = await page
    .evaluate(() => {
      const raw = localStorage.getItem('delve_mock_state_v9')
      return {
        access: localStorage.getItem('delve_access'),
        currentUser: raw ? JSON.parse(raw).currentUser : null,
      }
    })
    .catch(() => null)
  console.error(`FAIL at ${page.url()}: ${error.stack || error.message}`)
  console.error(`Root: ${rootText.replace(/\s+/g, ' ').slice(0, 500) || '(empty)'}`)
  console.error(`Auth state: ${JSON.stringify(authState)}`)
  if (pageErrors.length) console.error(`Page errors: ${pageErrors.join(' | ')}`)
  if (browserErrors.length) console.error(`Browser errors: ${browserErrors.join(' | ')}`)
  if (failedRequests.length) console.error(`Failed requests: ${failedRequests.slice(0, 20).join(' | ')}`)
  if (failedApiRequests.length) console.error(`Failed API requests: ${failedApiRequests.join(' | ')}`)
  process.exitCode = 1
} finally {
  await browser.close()
}
