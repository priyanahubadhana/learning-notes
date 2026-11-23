// Draws the Update card into the approved Settings v5 first page (docs/mockups/settings-v5/,
// approved 15 Nov) and saves settings-light.png and settings-dark.png beside this file.
// Only the Update card is added; everything else is Settings v5 as approved.
// Run: node docs/mockups/update-v3/render-settings.mjs
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const dir = path.dirname(fileURLToPath(import.meta.url))
const url = pathToFileURL(
  path.join(dir, '..', 'settings-v5', 'settings-v5.html'),
).href

const STATES = {
  light: {
    theme: 0,
    small: 'Version 1.4.1 · Up to date · checked 2 minutes ago',
    button: '<button type="button" class="btn">Check now</button>',
  },
  dark: {
    theme: 1,
    small: 'Version 1.4.2 is ready · you have 1.4.1 · about 2 MB',
    button: '<button type="button" class="btn pri" style="background: var(--accent); color: var(--on-accent)">Update</button>',
  },
}

const browser = await chromium.launch()
for (const [name, s] of Object.entries(STATES)) {
  const page = await browser.newPage({
    viewport: { width: 1180, height: 820 },
    deviceScaleFactor: 2,
  })
  await page.goto(url)
  await page.evaluate(
    ({ theme, small, button }) => {
      const v5 = window.__v5
      v5.pick('simple')
      v5.theme(theme)
      v5.go('home')
      document
        .querySelectorAll('.picker, [role="dialog"]')
        .forEach((d) => d.closest('dialog')?.close?.())
      const gh = [...document.querySelectorAll('.gh')].find((g) =>
        /Starter setups/.test(g.textContent),
      )
      // the icon is v5's own sync icon from the side list
      const icon =
        [...document.querySelectorAll('.navrow')]
          .find((r) => /Sync and backup/.test(r.textContent))
          ?.querySelector('.nic')?.innerHTML ?? ''
      const card = document.createElement('div')
      card.className = 'group'
      card.innerHTML =
        '<div class="row inl"><span class="nic">' +
        icon +
        '</span><div class="tx"><div class="lb"><span class="lbt">Update</span></div><div class="ds">' +
        small +
        '</div></div><div class="ctl">' +
        button +
        '</div></div>'
      gh.parentNode.insertBefore(card, gh)
      // the starter pick above shows a toast that is not part of this picture
      const hide = document.createElement('style')
      hide.textContent = '.sh-toast, #sh-toast { display: none !important }'
      document.head.append(hide)
    },
    s,
  )
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(dir, `settings-${name}.png`) })
  await page.close()
}
await browser.close()
