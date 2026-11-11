/**
 * English text of Phase I (notebook views, Layer gallery). Hindi and Spanish
 * are hiI.ts and esI.ts (machine drafts: mark for native review).
 */
export const enI = {
  // ---- Notebook views (I1) ----
  'notebook.view.button': 'View: {name} ▾',
  'notebook.view.default': 'Default',
  'notebook.view.shelf': 'Shelf',
  'notebook.view.tabs': 'Tabs',
  'notebook.layout.button': 'Layout: {name} ▾',
  'notebook.layout.list': 'List',
  'notebook.layout.gallery': 'Gallery',
  'notebook.layout.table': 'Table',
  'notebook.layout.board': 'Board',
  'notebook.col.title': 'Page',
  'notebook.col.sub': 'Sub-pages',
  'notebook.col.changed': 'Changed',
  'notebook.board.none': 'No colour',
  'notebook.board.coloured': 'Coloured',
  'notebook.sectionTabs': 'Sections',
  'notebook.openSection': 'Open {name}',
  'notebook.tabColour': 'Tab colour',
  'notebook.tabColourSet': 'Colour {n}',
  'notebook.tabColourNone': 'No colour',
  'notebook.noSubPages': 'No sub-pages in this section yet.',

  // ---- Layer gallery (I2) ----
  'layers.open': 'Layer gallery',
  'layers.title': 'Layer gallery',
  'layers.close': 'Close the Layer gallery',
  'layers.intro':
    'A layer adds a ready-made set of notebooks. It is made of normal notes you can change. Remove takes away only what you never changed.',
  'layers.whatItAdds': 'What it adds',
  'layers.add': 'Add',
  'layers.adding': 'Adding…',
  'layers.remove': 'Remove',
  'layers.removeRest': 'Remove the rest',
  'layers.yours': 'Added from files',
  'layers.addFile': 'Add a layer file…',
  'layers.addFileHint': 'A file a friend shared with you.',
  'layers.added': 'Added “{name}”.',
  'layers.removed_one': 'Removed “{name}” (1 item, in the Trash).',
  'layers.removed_other': 'Removed “{name}” ({count} items, in the Trash).',
  'layers.askRemove':
    'You changed some things in “{name}”: {list}. They will stay. Remove everything else?',
  'layers.share': 'Share as layer file',
  'layers.shared':
    'Layer file saved. A friend can open it with Layer gallery › Add a layer file.',
  'layers.err.manifest': 'This layer file has a damaged description.',
  'layers.err.notLayer': 'This is not a layer file.',
  'layers.err.already':
    '“{name}” is already added. Remove it first to add it again.',
  'layers.finance-tracker.name': 'Finance tracker',
  'layers.finance-tracker.desc':
    'Keep track of pocket money, spending and savings.',
  'layers.finance-tracker.add1':
    'A Transactions table with date, amount and category',
  'layers.finance-tracker.add2': 'A Dashboard and Board made from the category',
  'layers.finance-tracker.add3': 'A how-to page and a monthly review page',
  'layers.memory-kit.name': 'Memory techniques kit',
  'layers.memory-kit.desc': 'Learn the main memory tricks with practice cards.',
  'layers.memory-kit.add1': 'Memory palace, acronyms and spaced practice pages',
  'layers.memory-kit.add2': 'Recall cards for each technique',
  'layers.memory-kit.add3': 'A start-here page that explains why pictures work',
  'layers.study-kit.name': 'Study kit',
  'layers.study-kit.desc': 'Plan your week and study in a way that works.',
  'layers.study-kit.add1': 'A weekly plan with an exam checklist',
  'layers.study-kit.add2': 'A Cornell notes page',
  'layers.study-kit.add3': 'A Feynman check page with a card',

  // ---- Claude connector consent screen ----
  'connect.title': 'Connect Claude',
  'connect.intro':
    '{name} wants to use your Learning Notes. It never sees your password.',
  'connect.canDo': 'It will be able to:',
  'connect.sendsTo': 'After you choose, you go back to {host}.',
  'connect.allow': 'Allow',
  'connect.deny': 'Not now',
  'connect.signIn':
    'Sign in to Learning Notes in this browser first (Settings › Account), then connect again from Claude.',
  'connect.open': 'Open Learning Notes',
  'connect.bad': 'This connection link is not valid. Start again from Claude.',
  'connect.error': 'Could not connect. Check your internet and try again.',
  'connect.working': 'Connecting…',
  'connect.scope.read': 'Read your notebooks, pages and recall cards',
  'connect.scope.write':
    'Create notebooks, pages, cards and databases, and add to pages. It can never delete anything.',

  // ---- Settings > Claude: "Let Claude work with my notes" ----
  'settings.category.claude': 'Claude',
  'settings.category.claude.hint':
    'Let Claude on claude.ai read your notes and add to them.',
  'claude.title': 'Let Claude work with my notes',
  'claude.what':
    'When this is on, Claude on claude.ai (web, desktop or phone) can search and read the notebooks you choose, and add new notebooks, pages and recall cards. It can never delete or change what you already wrote. Anything it adds can be removed with "Remove this AI result".',
  'claude.privacy.title': 'What this means for your privacy',
  'claude.privacy.1':
    'Your notes are end-to-end encrypted, so normally even the server cannot read them. To let Claude in, this app gives the server your encryption key once. The server keeps it locked with a secret that is not stored in the database.',
  'claude.privacy.2':
    'While this is on, the server (and whoever controls it) can open the notebooks you choose. Claude sees the text it reads, and Anthropic handles that text under its own terms. Locked pages stay hidden unless a notebook allows AI while locked.',
  'claude.privacy.3':
    'It is off until you turn it on. Turning it off deletes the key copy and stops every Claude connection at once. It also switches itself off after 30 days without use.',
  'claude.choice.title': 'Which notebooks can Claude use?',
  'claude.choice.all': 'All my notebooks',
  'claude.choice.some': 'Only the notebooks I pick',
  'claude.choice.none': 'Pick at least one notebook.',
  'claude.pass.title': 'Turn it on',
  'claude.pass.help':
    'Type your sync passphrase to confirm. The passphrase stays on this device; only the key it opens is sent, once.',
  'claude.pass.submit': 'Turn on',
  'claude.state.on': 'On',
  'claude.state.off': 'Off',
  'claude.lastUsed':
    'Last used {when}. It switches itself off on {expires} if it is not used before then.',
  'claude.turnOff': 'Turn off',
  'claude.turnOff.confirm':
    'Turn off Claude? The server deletes its copy of your key and every Claude connection stops now.',
  'claude.saveChoice': 'Save choice',
  'claude.saved': 'Saved.',
  'claude.apps.title': 'Connected apps',
  'claude.apps.none':
    'No app is connected yet. Add the connector in claude.ai under Settings, Connectors.',
  'claude.apps.row': '{name}, last active {when}',
  'claude.apps.revoke': 'Revoke',
  'claude.apps.revokeFor': 'Revoke {name}',
  'claude.error.login': 'Sign in to your account first (Settings › Account).',
  'claude.error.generic':
    'Could not reach the server. Check your internet and try again.',
  'claude.error.unavailable': 'This is not set up on the server yet.',
  'claude.noSync':
    'Set up sync first (Settings › Sync): Claude uses the same key.',
  'claude.loading': 'Checking…',
  'claude.retry': 'Try again',
}
