import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/** Stable id for this build — Heroku slug commit when available. */
export function resolveDelveBuildId(): string {
  return (
    process.env.SOURCE_VERSION ||
    process.env.HEROKU_SLUG_COMMIT ||
    process.env.VITE_DELVE_BUILD_ID ||
    `local-${Date.now()}`
  )
}

/**
 * Writes dist/version.json (no-cache) and injects __DELVE_BUILD_ID__ for
 * open-tab update detection.
 */
export function delveBuildVersionPlugin(): Plugin {
  const buildId = resolveDelveBuildId()
  let outDir = 'dist'

  return {
    name: 'delve-build-version',
    config() {
      return {
        define: {
          __DELVE_BUILD_ID__: JSON.stringify(buildId),
        },
      }
    },
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle() {
      const payload = {
        buildId,
        builtAt: new Date().toISOString(),
      }
      mkdirSync(outDir, { recursive: true })
      writeFileSync(path.join(outDir, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    },
    transformIndexHtml(html) {
      const stamp = [
        `<meta name="delve-build-id" content="${buildId}" />`,
        // Helps proxies that ignore Cache-Control on HTML
        `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />`,
      ].join('\n    ')
      return html.replace(/<\/head>/i, `    ${stamp}\n  </head>`)
    },
  }
}
