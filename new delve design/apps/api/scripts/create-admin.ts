/**
 * Secure first-administrator bootstrap CLI.
 * Prefer `pnpm admin:create`. Never pass passwords as arguments.
 */
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output, stderr } from 'node:process'
import { prisma } from '@delve/database'
import { bootstrapFirstAdmin } from '../src/modules/admin/admin-bootstrap.js'

async function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return (await rl.question(question)).trim()
}

async function promptHidden(question: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const wasRaw = input.isTTY && (input as NodeJS.ReadStream).isRaw
    stderr.write(question)
    let value = ''
    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString('utf8')
      for (const ch of text) {
        if (ch === '\n' || ch === '\r') {
          cleanup()
          stderr.write('\n')
          resolve(value)
          return
        }
        if (ch === '\u0003') {
          cleanup()
          reject(new Error('Interrupted'))
          return
        }
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1)
          continue
        }
        value += ch
      }
    }
    const cleanup = () => {
      input.off('data', onData)
      if (input.isTTY) {
        try {
          ;(input as NodeJS.ReadStream).setRawMode(Boolean(wasRaw))
        } catch {
          // ignore
        }
      }
      input.pause()
    }
    if (input.isTTY) {
      try {
        ;(input as NodeJS.ReadStream).setRawMode(true)
      } catch {
        // ignore
      }
    }
    input.resume()
    input.on('data', onData)
  })
}

async function main() {
  const rl = createInterface({ input, output, terminal: true })
  try {
    const email = await prompt(rl, 'Administrator email: ')
    const username = await prompt(rl, 'Administrator username: ')
    rl.pause()
    const password = await promptHidden('Password (hidden): ')
    const confirm = await promptHidden('Confirm password (hidden): ')
    rl.resume()
    if (password !== confirm) {
      console.error('Passwords do not match.')
      process.exitCode = 1
      return
    }

    const result = await bootstrapFirstAdmin({ email, username, password })
    if (!result.ok) {
      console.error(result.message)
      process.exitCode = 1
      return
    }

    console.log('Administrator created successfully.')
    console.log(`Email: ${result.email}`)
    console.log(`Username: ${result.username}`)
    console.log('Sign in at the admin-web application. Credentials were not printed.')
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

main().catch(async err => {
  console.error(err instanceof Error ? err.message : 'Bootstrap failed')
  try {
    await prisma.$disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})
