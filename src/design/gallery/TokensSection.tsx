import { LAYERS } from '../../app/overlay'
import { Cells, Demo, Section } from './Bits'
import { G } from './galleryText'

const CARD_VARS = [
  'card-fill',
  'card-well',
  'card-well-2',
  'card-hair',
  'card-track',
]
const SHELL = [
  'sh-rail',
  'sh-side',
  'sh-panel',
  'sh-top',
  'sh-tabbar',
  'sh-sheet',
  'sh-hit',
  'sh-gap',
]
const MOTION = [
  ['120 ms', 'var(--dur-1)', 'var(--ease-out)'],
  ['180 ms', 'var(--dur-2)', 'var(--ease-out)'],
  ['240 ms', 'var(--dur-3)', 'var(--ease-out)'],
  ['Spring', 'var(--dur-3)', 'var(--ease-spring)'],
] as const

export default function TokensSection() {
  return (
    <Section
      id="tokens"
      title={G.partTokens}
      help="Card fills, layers, motion and shell sizes, in the live theme."
    >
      <Cells>
        <Demo state="card-fills" label="Card fill, wells, hairs">
          <ul className="flex flex-wrap gap-3">
            {CARD_VARS.map((v) => (
              <li key={v} className="text-center">
                <span
                  data-testid={`swatch-${v}`}
                  className="border-line-strong block size-14 rounded-[var(--r-sm)] border"
                  style={{ background: `var(--${v})` }}
                />
                <span className="t-small text-muted">{v}</span>
              </li>
            ))}
          </ul>
        </Demo>
        <Demo state="layers" label="Layers, bottom to top">
          <ol data-testid="layer-list" className="t-small flex flex-col gap-1">
            {Object.entries(LAYERS).map(([name, z]) => (
              <li key={name}>
                <b>{name}</b> <span className="text-muted">{z}</span>
              </li>
            ))}
          </ol>
        </Demo>
        <Demo state="shell-sizes" label="Shell sizes">
          <ul className="t-small flex flex-col gap-1">
            {SHELL.map((v) => (
              <li key={v} className="flex items-center gap-2">
                <span className="text-muted w-20">{v}</span>
                <span
                  data-testid={`size-${v}`}
                  className="bg-accent block h-2 rounded-[var(--r-xs)]"
                  style={{ width: `var(--${v})` }}
                />
              </li>
            ))}
          </ul>
        </Demo>
      </Cells>
      <Demo state="motion" label="Motion bars (they replay on hover)">
        <ul className="flex flex-col gap-2">
          {MOTION.map(([name, dur, ease]) => (
            <li key={name} className="group flex items-center gap-3">
              <span className="t-small text-muted w-16">{name}</span>
              <span className="bg-neutral-fill block h-3 w-64 max-w-full rounded-full">
                <span
                  data-testid="motion-bar"
                  className="bg-accent block h-3 w-8 rounded-full transition-transform group-hover:translate-x-56"
                  style={{
                    transitionDuration: dur,
                    transitionTimingFunction: ease,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Demo>
    </Section>
  )
}
