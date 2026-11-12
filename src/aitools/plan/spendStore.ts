import { readPref, writePref } from '../../app/uiPrefs'
import {
  DEFAULT_SPEND_SETTINGS,
  SpendGate,
  type LedgerState,
  type SpendLedger,
  type SpendSettings,
} from './spendGate'

/**
 * Where the spend limit and this month's ledger live in the app: small local
 * preferences on this device. Nothing here is a key or a secret, and nothing
 * here changes the database. Any missing, broken or odd value reads as the
 * default, which is the owner's limit: Rs 0.
 */
const SETTINGS_KEY = 'aifw.spend'
const LEDGER_KEY = 'aifw.spendLedger'

const isNum = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0

const isSettings = (v: unknown): v is SpendSettings =>
  !!v &&
  typeof v === 'object' &&
  isNum((v as SpendSettings).monthlyInr) &&
  isNum((v as SpendSettings).perJobInr) &&
  isNum((v as SpendSettings).askAboveInr)

const isLedger = (v: unknown): v is LedgerState =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as LedgerState).month === 'string' &&
  isNum((v as LedgerState).spentInr) &&
  !!(v as LedgerState).reserved &&
  typeof (v as LedgerState).reserved === 'object' &&
  Object.values((v as LedgerState).reserved).every(isNum)

export const readSpendSettings = (): SpendSettings =>
  readPref(SETTINGS_KEY, isSettings, DEFAULT_SPEND_SETTINGS)

export class PrefLedger implements SpendLedger {
  read(): LedgerState | null {
    return readPref<LedgerState | null>(
      LEDGER_KEY,
      (v): v is LedgerState | null => v === null || isLedger(v),
      null,
    )
  }
  write(state: LedgerState): void {
    writePref(LEDGER_KEY, state)
  }
}

/** The app's gate: local settings, local ledger. */
export const appGate = (): SpendGate =>
  new SpendGate({ settings: readSpendSettings, ledger: new PrefLedger() })
