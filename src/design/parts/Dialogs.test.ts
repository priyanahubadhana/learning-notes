// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AlertDialog, ConfirmDialog, PromptDialog } from './Dialogs'
import {
  $,
  byLabel,
  cleanDom,
  click,
  key,
  mount,
  type as typeInto,
} from './testHelpers'

afterEach(cleanDom)

const confirm = (extra = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  mount(h(ConfirmDialog, { title: 'Delete?', onConfirm, onCancel, ...extra }))
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('is an alertdialog that is modal, with a close button', () => {
    confirm()
    const d = $('[role="alertdialog"]')
    expect(d?.getAttribute('aria-modal')).toBe('true')
    expect(byLabel('Close')).not.toBeNull()
  })

  it('Esc cancels', () => {
    const { onCancel } = confirm()
    key(document.body, 'Escape')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('the close button and the Cancel button cancel', () => {
    const { onCancel } = confirm()
    click(byLabel('Close'))
    click($('[data-testid="fb-dialog-cancel"]'))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('Enter confirms; the main button is focused first', () => {
    const { onConfirm } = confirm()
    expect(document.activeElement).toBe($('[data-main]'))
    key($('[role="alertdialog"]'), 'Enter')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('is red only for danger', () => {
    confirm()
    expect($('[data-testid="fb-dialog-main"]')?.dataset.variant).toBe('main')
    cleanDom()
    confirm({ danger: true })
    expect($('[data-testid="fb-dialog-main"]')?.dataset.variant).toBe('danger')
  })

  it('returns focus to the button that opened it', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const m = mount(
      h(ConfirmDialog, {
        title: 'x',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
        opener,
      }),
    )
    expect(document.activeElement).not.toBe(opener)
    m.unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab inside the dialog', () => {
    confirm()
    const main = $('[data-main]') as HTMLElement
    main.focus()
    key(main, 'Tab')
    expect($('[role="alertdialog"]')?.contains(document.activeElement)).toBe(
      true,
    )
  })
})

describe('AlertDialog', () => {
  it('has one OK button; Esc and the close button also close', () => {
    const onClose = vi.fn()
    mount(h(AlertDialog, { title: 'Offline', onClose }))
    expect($('[data-testid="fb-dialog-cancel"]')).toBeNull()
    click($('[data-testid="fb-dialog-main"]'))
    key(document.body, 'Escape')
    click(byLabel('Close'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

describe('PromptDialog', () => {
  const prompt = () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    mount(h(PromptDialog, { title: 'Name', label: 'Name', onSubmit, onCancel }))
    return { onSubmit, onCancel }
  }
  const input = () => $<HTMLInputElement>('input')

  it('focuses the field and limits it to 40 characters', () => {
    prompt()
    expect(document.activeElement).toBe(input())
    expect(input()?.maxLength).toBe(40)
  })

  it('shows the count from 32 characters, not before', () => {
    prompt()
    typeInto(input(), 'a'.repeat(31))
    expect($('[data-testid="fb-prompt-count"]')?.hidden).toBe(true)
    typeInto(input(), 'a'.repeat(32))
    const c = $('[data-testid="fb-prompt-count"]')
    expect(c?.hidden).toBe(false)
    expect(c?.textContent).toBe('32 of 40')
  })

  it('the clear button empties the name', () => {
    prompt()
    typeInto(input(), 'Maths')
    click($('[data-testid="clr-btn"]'))
    expect(input()?.value).toBe('')
  })

  it('Enter saves a trimmed name; an empty name cannot be saved', () => {
    const { onSubmit } = prompt()
    expect(
      ($('[data-testid="fb-dialog-main"]') as HTMLButtonElement).disabled,
    ).toBe(true)
    key(input(), 'Enter')
    expect(onSubmit).not.toHaveBeenCalled()
    typeInto(input(), '  Maths ')
    key(input(), 'Enter')
    expect(onSubmit).toHaveBeenCalledWith('Maths')
  })
})
