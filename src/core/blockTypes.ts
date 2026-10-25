import type { JsonObject } from './types'

/**
 * Block type registry: the plug-in point for block types.
 *
 * Each block type (paragraph, heading, to-do, …) is described by a
 * definition and registered here. Adding a new type means registering a new
 * definition; no core code changes. Blocks whose type is not registered are
 * still stored and kept as-is, so data is never lost.
 */

/** Describes one kind of block. */
export interface BlockTypeDefinition {
  /** Unique type name stored on each block (e.g. "paragraph"). */
  type: string
  /** Human-readable name for menus (e.g. the slash menu). */
  label: string
  /** Content for a brand-new block of this type (a fresh object each call). */
  createContent: () => JsonObject
}

/** A set of registered block types. */
export interface BlockTypeRegistry {
  /** Adds a block type. Throws if the type name is already registered. */
  register: (definition: BlockTypeDefinition) => void
  /** Returns the definition for a type, or undefined if not registered. */
  get: (type: string) => BlockTypeDefinition | undefined
  /** True if the type is registered. */
  has: (type: string) => boolean
  /** All registered definitions, in registration order. */
  list: () => BlockTypeDefinition[]
}

/** Creates a registry, optionally pre-filled with definitions. */
export function createBlockTypeRegistry(
  initial: readonly BlockTypeDefinition[] = [],
): BlockTypeRegistry {
  const definitions = new Map<string, BlockTypeDefinition>()

  const registry: BlockTypeRegistry = {
    register(definition) {
      if (definitions.has(definition.type)) {
        throw new Error(`Block type already registered: ${definition.type}`)
      }
      definitions.set(definition.type, definition)
    },
    get: (type) => definitions.get(type),
    has: (type) => definitions.has(type),
    list: () => [...definitions.values()],
  }

  for (const definition of initial) registry.register(definition)
  return registry
}
