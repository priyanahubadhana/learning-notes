import { useState } from 'react'
import { Card, CardTrigger } from '../parts/Card'
import {
  CardGroup,
  CardNote,
  CardWell,
  Swatch,
  SwitchRow,
  Tile,
  TileGroup,
} from '../parts/CardParts'
import { Cells, Demo, Section } from './Bits'

const noop = () => {}
const COLOURS = ['#6941e0', '#0ea5e9', '#16a34a', '#f59e0b']

function Tiles({ prefix }: { prefix: string }) {
  const cell = (state: string) => ({
    style: { display: 'contents' } as const,
    'data-state': state,
  })
  return (
    <CardGroup label="Tile states">
      <TileGroup label={`${prefix} tiles`} columns={3}>
        <span {...cell('tile-default')}>
          <Tile label="Default" testId={`${prefix}-tile-default`} />
        </span>
        <span {...cell('tile-hover')}>
          <Tile label="Hover" force="hover" testId={`${prefix}-tile-hover`} />
        </span>
        <span {...cell('tile-pressed')}>
          <Tile
            label="Pressed"
            force="pressed"
            testId={`${prefix}-tile-pressed`}
          />
        </span>
        <span {...cell('tile-selected')}>
          <Tile label="Selected" selected testId={`${prefix}-tile-selected`} />
        </span>
        <span {...cell('tile-disabled')}>
          <Tile label="Disabled" disabled testId={`${prefix}-tile-disabled`} />
        </span>
      </TileGroup>
    </CardGroup>
  )
}

function Lines({ n }: { n: number }) {
  return (
    <CardWell>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="pcard-row">
          Row {i + 1}
        </div>
      ))}
    </CardWell>
  )
}

/** A real ▾ that opens a real, anchored card (SP-02 to SP-07). */
function Live({ align }: { align: 'left' | 'right' }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [glow, setGlow] = useState(0)
  const [colour, setColour] = useState(COLOURS[0])
  const id = `live-${align}`
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : ''}`}>
      <CardTrigger
        open={!!anchor}
        label={`Choose colour (${align})`}
        glowKey={glow}
        testId={`${id}-trigger`}
        onClick={(el) => setAnchor(anchor ? null : el)}
      >
        <i
          aria-hidden
          className="mr-2 inline-block size-4 rounded-full"
          style={{ background: colour }}
        />
        Colour
      </CardTrigger>
      {anchor && (
        <Card
          anchor={anchor}
          size="pick"
          title="Colour"
          autoClose
          testId={`${id}-card`}
          onClose={() => setAnchor(null)}
        >
          <TileGroup label="Colour" columns={4}>
            {COLOURS.map((c) => (
              <Swatch
                key={c}
                colour={c}
                label={c}
                selected={c === colour}
                testId={`${id}-swatch`}
                onSelect={() => {
                  setColour(c)
                  setGlow((g) => g + 1)
                }}
              />
            ))}
          </TileGroup>
        </Card>
      )}
    </div>
  )
}

function Tall() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <div>
      <CardTrigger
        open={!!anchor}
        label="Open a tall card"
        testId="live-tall-trigger"
        onClick={(el) => setAnchor(anchor ? null : el)}
      >
        Tall card
      </CardTrigger>
      {anchor && (
        <Card
          anchor={anchor}
          size="panel"
          title="A long list"
          testId="live-tall-card"
          onClose={() => setAnchor(null)}
        >
          <Lines n={60} />
        </Card>
      )}
    </div>
  )
}

export default function CardSection() {
  const [sw, setSw] = useState(true)
  return (
    <Section
      id="card"
      title="Card and the ▾ frame"
      help="Pick card 304, panel card 376, and the phone sheet. Live cards open from the ▾ buttons."
    >
      <Demo
        state="live"
        label="Live: tap a ▾ (Esc, an outside tap or another card closes it)"
      >
        <div className="flex flex-col gap-3">
          <Live align="left" />
          <Tall />
          <Live align="right" />
        </div>
      </Demo>
      <Cells>
        <Demo state="pick-open" label="Pick card, open (304)">
          <Card
            anchor={null}
            size="pick"
            title="Pick"
            placement="static"
            testId="gal-pick-card"
            onClose={noop}
          >
            <Tiles prefix="pick" />
          </Card>
        </Demo>
        <Demo state="panel-open" label="Panel card, open (376)">
          <Card
            anchor={null}
            size="panel"
            title="Panel"
            placement="static"
            testId="gal-panel-card"
            onClose={noop}
            footer={<CardNote>Footer note</CardNote>}
          >
            <Tiles prefix="panel" />
            <CardGroup label="Switch">
              <CardWell>
                <SwitchRow label="Show it" checked={sw} onChange={setSw} />
              </CardWell>
            </CardGroup>
          </Card>
        </Demo>
        <Demo
          state="scroll-fade"
          label="Taller than the screen: scrolls, bottom edge fades"
        >
          <div style={{ maxHeight: 260, display: 'flex' }}>
            <Card
              anchor={null}
              size="pick"
              title="Scrolling"
              placement="static"
              testId="gal-scroll-card"
              onClose={noop}
            >
              <Lines n={30} />
            </Card>
          </div>
        </Demo>
        <Demo state="phone-sheet" label="Phone sheet (grab bar)">
          <Card
            anchor={null}
            size="pick"
            title="Phone"
            placement="static"
            phone
            testId="gal-phone-card"
            onClose={noop}
          >
            <Tiles prefix="phone" />
          </Card>
        </Demo>
        <Demo state="loading" label="Loading (skeleton wells)">
          <Card
            anchor={null}
            size="pick"
            title="Loading"
            placement="static"
            loading
            testId="gal-loading-card"
            onClose={noop}
          >
            <span />
          </Card>
        </Demo>
      </Cells>
    </Section>
  )
}
