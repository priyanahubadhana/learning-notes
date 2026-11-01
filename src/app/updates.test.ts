import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  offerUpdate,
  onUpdateOffer,
  repeatUpdateOffer,
  resetUpdates,
} from './updates'

describe('update offer', () => {
  beforeEach(resetUpdates)

  it('reaches a listener that is already there', () => {
    const listen = vi.fn()
    const apply = vi.fn()
    onUpdateOffer(listen)
    offerUpdate(apply)
    expect(listen).toHaveBeenCalledWith(apply)
    expect(apply).not.toHaveBeenCalled() // only the user starts the update
  })

  it('waits for a listener that comes later', () => {
    const listen = vi.fn()
    const apply = vi.fn()
    offerUpdate(apply)
    onUpdateOffer(listen)
    expect(listen).toHaveBeenCalledWith(apply)
  })

  it('repeats only when an update is waiting', () => {
    const listen = vi.fn()
    onUpdateOffer(listen)
    repeatUpdateOffer()
    expect(listen).not.toHaveBeenCalled()
    offerUpdate(vi.fn())
    repeatUpdateOffer()
    expect(listen).toHaveBeenCalledTimes(2)
  })

  it('stops after the listener leaves', () => {
    const listen = vi.fn()
    onUpdateOffer(listen)()
    offerUpdate(vi.fn())
    expect(listen).not.toHaveBeenCalled()
  })
})
