import { useState } from 'react'
import { ObjectBar, type ObjectBarAction } from '../parts/ObjectBar'
import { Cells, Demo, Section } from './Bits'
import { G } from './galleryText'

const COMMON: ObjectBarAction[] = [
  { id: 'duplicate', icon: 'duplicate', label: 'Duplicate' },
  { id: 'lock', icon: 'lock', label: 'Lock' },
  { id: 'delete', icon: 'trash', label: 'Delete', danger: true },
]
const SETS: Record<string, ObjectBarAction[]> = {
  box: [{ id: 'colour', icon: 'palette', label: 'Colour' }, ...COMMON],
  text: [
    { id: 'bold', icon: 'type', label: 'Text style', pressed: false },
    { id: 'colour', icon: 'palette', label: 'Colour' },
    ...COMMON,
  ],
  picture: [{ id: 'crop', icon: 'scissors', label: 'Crop' }, ...COMMON],
  table: [
    { id: 'row', icon: 'plus', label: 'Add row' },
    { id: 'col', icon: 'table', label: 'Add column' },
    ...COMMON,
  ],
}

export default function ObjBarSection() {
  const [did, setDid] = useState('Nothing pressed yet')
  const act = (id: string) => setDid(id)
  return (
    <Section
      id="objbar"
      title={G.objectBar}
      help="One toolbar over a selected thing. Extra actions go in a … menu."
    >
      <p className="t-small" data-testid="objbar-did" aria-live="polite">
        {did}
      </p>
      <Cells>
        {(['box', 'text', 'picture', 'table'] as const).map((k) => (
          <Demo key={k} state={k} label={k[0].toUpperCase() + k.slice(1)}>
            <ObjectBar kind={k} actions={SETS[k]} onAction={act} />
          </Demo>
        ))}
        <Demo state="multi" label="Three rows selected">
          <ObjectBar
            kind="rows"
            count={3}
            actions={[
              { id: 'duplicate', icon: 'duplicate', label: 'Duplicate' },
              { id: 'delete', icon: 'trash', label: 'Delete', danger: true },
            ]}
            onAction={act}
          />
        </Demo>
        <Demo state="overflow" label="Narrow: the rest goes in …">
          <ObjectBar
            kind="box"
            maxWidth={180}
            actions={[
              ...SETS.box,
              { id: 'move', icon: 'move', label: 'Move' },
              { id: 'layers', icon: 'layers', label: 'Order' },
            ]}
            onAction={act}
          />
        </Demo>
        <Demo state="danger" label="Danger action (hover the bin)">
          <ObjectBar
            kind="box"
            actions={[
              { id: 'delete', icon: 'trash', label: 'Delete', danger: true },
            ]}
            onAction={act}
          />
        </Demo>
      </Cells>
    </Section>
  )
}
