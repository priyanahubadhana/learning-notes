import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, sidebar, typeInEditor } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test('CSV: import rows into a database (mapping), then export them', async ({
  page,
}) => {
  await page.goto('/')
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()

  await main(page).getByRole('button', { name: 'Database options' }).click()
  await page.getByRole('menuitem', { name: 'Import CSV…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await dialog.getByLabel('CSV file').setInputFiles({
    name: 'books.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Title,Author,Pages\r\nDune,"Herbert, Frank",412\r\nEmma,Austen,320\r\n',
    ),
  })
  await expect(dialog).toContainText('2 rows found.')
  // Title and Author match the Books columns; Pages becomes a new Number column.
  await expect(dialog.getByLabel('What “Pages” becomes')).toHaveValue(
    'new:number',
  )
  await dialog.getByRole('button', { name: 'Import 2 rows' }).click()
  await expect(
    page.getByText('Imported 2 rows and made 1 new columns.'),
  ).toBeVisible()

  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  await expect(
    main(page).getByRole('row').filter({ hasText: 'Dune' }),
  ).toContainText('Herbert, Frank')
  await expect(
    main(page).getByRole('row').filter({ hasText: 'Emma' }),
  ).toContainText('320')

  const downloading = page.waitForEvent('download')
  await main(page).getByRole('button', { name: 'Database options' }).click()
  await page.getByRole('menuitem', { name: 'Export as CSV' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toBe('Books.csv')
  const text = await readFile(await file.path(), 'utf8')
  expect(text).toContain('Title,Author,Status,Rating,Finished,Pages')
  expect(text).toContain('Dune,"Herbert, Frank"')
})

test('a notebook file round-trips as a new copy; nothing existing changes', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'S1 is the first sound')
  await sidebar(page).getByRole('button', { name: 'Backup & files' }).click()

  const downloading = page.waitForEvent('download')
  await main(page)
    .getByRole('region', { name: 'Save a notebook as a file' })
    .getByRole('button', { name: 'Save file' })
    .click()
  const file = await downloading
  expect(file.suggestedFilename()).toBe('Cardiology.learningnotes.json')
  const saved = JSON.parse(await readFile(await file.path(), 'utf8'))
  expect(saved).toMatchObject({
    app: 'learning-notes',
    kind: 'notebook',
    formatVersion: 1,
  })
  // The notebook's own page, plus the templates (journal days and templates are included by default).
  const own = saved.pages.filter(
    (p: { notebookId: string }) => p.notebookId === saved.notebooks[0].id,
  )
  expect(own.map((p: { title: string }) => p.title)).toEqual(['Heart sounds'])
  expect(saved.notebooks.map((n: { kind?: string }) => n.kind)).toContain(
    'templates',
  )

  await main(page)
    .getByLabel('File to import')
    .setInputFiles(await file.path())
  await expect(
    page.getByText(
      /Imported 1 notebooks, \d+ pages and 0 cards as new copies\./,
    ),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', {
      name: 'Cardiology (imported)',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Cardiology', exact: true }),
  ).toBeVisible()

  // The templates in the file were already here: none is added twice.
  await expect(
    sidebar(page).getByRole('button', { name: /\(imported\)$/ }),
  ).toHaveCount(1)

  // A file that is not ours is refused with a clear message.
  await main(page)
    .getByLabel('File to import')
    .setInputFiles({
      name: 'other.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    })
  await expect(main(page).getByRole('alert')).toContainText(
    'not a Learning Notes file',
  )
})

test('the browser backup can be restored as copies', async ({ page }) => {
  await page.goto('/favicon.svg')
  await page.evaluate(async () => {
    const wait = (r: IDBRequest | IDBOpenDBRequest) =>
      new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      })
    await wait(indexedDB.deleteDatabase('learning-notes-backup'))
    const open = indexedDB.open('learning-notes-backup', 1)
    open.onupgradeneeded = () => {
      open.result.createObjectStore('tables')
      open.result.createObjectStore('info')
    }
    const backup = (await wait(open)) as IDBDatabase
    const base = { createdAt: 1, updatedAt: 1, deletedAt: null }
    const tx = backup.transaction(['tables', 'info'], 'readwrite')
    tx.objectStore('tables').put(
      [
        {
          ...base,
          id: 'n1',
          workspaceId: 'w',
          title: 'Old notebook',
          order: 'a0',
        },
      ],
      'notebooks',
    )
    tx.objectStore('tables').put(
      [
        {
          ...base,
          id: 'p1',
          notebookId: 'n1',
          parentId: null,
          title: 'Old page',
          order: 'a0',
        },
      ],
      'pages',
    )
    tx.objectStore('info').put(
      {
        app: 'learning-notes',
        dbName: 'learning-notes',
        version: 7,
        createdAt: Date.now(),
        tableNames: ['notebooks', 'pages'],
      },
      'info',
    )
    await new Promise((resolve) => (tx.oncomplete = resolve))
    backup.close()
  })
  await page.goto('/')
  await sidebar(page).getByRole('button', { name: 'Backup & files' }).click()
  const section = main(page).getByRole('region', {
    name: 'Restore the automatic backup',
  })
  await expect(section).toContainText('1 notebooks')
  await section.getByRole('button', { name: 'Restore as copies' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Old notebook (imported)' }),
  ).toBeVisible()
})

test('Load sample notebook adds a ready-made notebook and changes nothing else', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Mine', 'My page')
  await sidebar(page).getByRole('button', { name: 'Backup & files' }).click()
  const box = main(page).getByRole('region', {
    name: 'For testing: sample notebook',
  })
  await box.getByRole('button', { name: 'Load sample notebook' }).click()
  await expect(
    page.getByText('Added the sample notebook “Sample notebook”.'),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Mine', exact: true }),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'My page', exact: true }),
  ).toBeVisible()

  // Check 1: Revise shows all four labels on the sample's two lessons.
  await sidebar(page)
    .getByRole('button', { name: 'Sample notebook', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Revise' }).click()
  const sheet = main(page).getByRole('region', { name: 'Revise' })
  await expect(
    sheet.getByRole('button', { name: /^Heart sounds\s*4$/ }),
  ).toBeVisible()
  for (const label of ['Key point', 'Keyword', 'Must know', 'Formula']) {
    await expect(sheet.getByRole('region', { name: label })).toBeVisible()
  }
  await expect(sheet.getByRole('region', { name: 'Formula' })).toContainText(
    'CO = HR × SV',
  )
  await sheet.getByRole('button', { name: /^Lung volumes/ }).click()
  await expect(sheet.getByRole('region', { name: 'Must know' })).toContainText(
    'FEV1/FVC',
  )

  // Cards tab: the sample has four cards.
  await main(page).getByRole('tab', { name: 'Cards' }).click()
  await expect(main(page)).toContainText('4 cards')

  // Checks 2 and 4: its database has a Date and a Web link column; Calendar and Gallery work.
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page)
    .getByRole('button', { name: /^Reading list/ })
    .click()
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await expect(
    main(page).locator('[data-calendar-day]').getByRole('button').first(),
  ).toBeVisible()
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Gallery' })
    .click()
  await expect(main(page).getByText('5 tiles')).toBeVisible()
  await expect(main(page).locator('li img')).toHaveCount(5)
})
