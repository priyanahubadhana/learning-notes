import {
  createBlockTypeRegistry,
  type BlockTypeDefinition,
} from '../core/blockTypes'

/**
 * Built-in block types for Phase 1. Type names match BlockNote's where one
 * exists, which keeps the editor bridge (step 5) simple.
 *
 * `text` holds rich text as an array of inline runs; its exact shape is
 * fixed by the editor bridge in step 5. Empty array = empty block.
 */
export const builtinBlockTypes: readonly BlockTypeDefinition[] = [
  { type: 'paragraph', label: 'Text', createContent: () => ({ text: [] }) },
  {
    type: 'heading',
    label: 'Heading',
    createContent: () => ({ text: [], level: 1 }),
  },
  {
    type: 'bulletListItem',
    label: 'Bulleted list',
    createContent: () => ({ text: [] }),
  },
  {
    type: 'numberedListItem',
    label: 'Numbered list',
    createContent: () => ({ text: [] }),
  },
  {
    type: 'checkListItem',
    label: 'To-do',
    createContent: () => ({ text: [], checked: false }),
  },
  { type: 'quote', label: 'Quote', createContent: () => ({ text: [] }) },
  { type: 'divider', label: 'Divider', createContent: () => ({}) },
  {
    type: 'codeBlock',
    label: 'Code',
    createContent: () => ({ text: [], language: 'plaintext' }),
  },
  {
    type: 'image',
    label: 'Image',
    createContent: () => ({ url: '', caption: '' }),
  },
  {
    type: 'callout',
    label: 'Callout',
    createContent: () => ({ text: [], emoji: '💡' }),
  },
  { type: 'card', label: 'Card', createContent: () => ({ text: [] }) },
  {
    type: 'cardList',
    label: 'Card list',
    createContent: () => ({ includeSubpages: false }),
  },
  {
    type: 'database',
    label: 'Database',
    createContent: () => ({ databaseId: '' }),
  },
  {
    type: 'pageLink',
    label: 'Page link',
    createContent: () => ({ pageId: '' }),
  },
]

/** The app's block type registry, pre-filled with the built-in types. */
export const blockTypes = createBlockTypeRegistry(builtinBlockTypes)
