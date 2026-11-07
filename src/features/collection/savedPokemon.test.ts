import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

const KEY = 'pokedex:local-collection:v2'
const LEGACY_KEY = 'pokedex:saved-pokemon:v1'
const FORMAT = 'pokedex-web-local-collection'

let store: Map<string, string>
let storageListener: (event: { key: string | null }) => void
let loads = 0

/** Loads a fresh copy of the module, as a new app session or browser tab would. */
async function load() {
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
      addEventListener: (_type: string, listener: typeof storageListener) => {
        storageListener = listener
      },
    },
  })
  return await import(`./savedPokemon.ts?load=${loads++}`)
}

const stored = () =>
  JSON.parse(store.get(KEY) ?? '{}').records.map((record: { name: string }) => record.name)
const backup = (records: unknown[], version = 2) =>
  JSON.stringify({ format: FORMAT, version, records })

beforeEach(() => {
  store = new Map()
})

test('a save keeps what another tab wrote, even with nothing on screen', async () => {
  store.set(KEY, JSON.stringify({ version: 2, records: [{ name: 'bulbasaur', owned: true }] }))
  const collection = await load()
  collection.toggleSavedPokemon('ivysaur')

  const fromOtherTab = JSON.parse(store.get(KEY)!)
  fromOtherTab.records.push({ name: 'pikachu', owned: true })
  store.set(KEY, JSON.stringify(fromOtherTab))
  storageListener({ key: KEY })

  collection.toggleSavedPokemon('mew')
  assert.deepEqual(stored(), ['bulbasaur', 'ivysaur', 'pikachu', 'mew'])
})

test('changes to other storage keys do not reload the collection', async () => {
  store.set(KEY, JSON.stringify({ version: 2, records: [{ name: 'bulbasaur', owned: true }] }))
  const collection = await load()
  collection.toggleSavedPokemon('mew')
  store.delete(KEY)
  storageListener({ key: 'pokedex:theme:v1' })
  collection.toggleSavedPokemon('pikachu')
  assert.deepEqual(stored(), ['bulbasaur', 'mew', 'pikachu'])
})

test('migrates the oldest format, a list of names', async () => {
  store.set(LEGACY_KEY, JSON.stringify(['Pikachu', 'pikachu', 'mew', 'not valid!']))
  const collection = await load()
  collection.toggleSavedPokemon('eevee')
  assert.deepEqual(stored(), ['pikachu', 'mew', 'eevee'])
})

test('migrates stored checklist records and drops ones with no flag set', async () => {
  store.set(
    KEY,
    JSON.stringify({
      version: 2,
      records: [
        { name: 'pikachu', favorite: false, seen: true, caught: false },
        { name: 'mew', favorite: false, seen: false, caught: false },
      ],
    }),
  )
  const collection = await load()
  assert.deepEqual(collection.exportCollection().records, [{ name: 'pikachu', owned: true }])
})

test('a version 1 backup imports even when a record has no flag set', async () => {
  const collection = await load()
  const result = collection.importCollection(
    backup(
      [
        { name: 'pikachu', favorite: true, seen: true, caught: false },
        { name: 'mew', favorite: false, seen: false, caught: false },
      ],
      1,
    ),
  )
  assert.equal(result.imported, 1)
  assert.deepEqual(stored(), ['pikachu'])
})

test('a malformed record rejects the whole backup and changes nothing', async () => {
  store.set(KEY, JSON.stringify({ version: 2, records: [{ name: 'mew', owned: true }] }))
  const collection = await load()
  assert.throws(
    () => collection.importCollection(backup([{ name: 'pikachu', owned: true }, { nope: 1 }])),
    /Record 2 is invalid/,
  )
  assert.deepEqual(stored(), ['mew'])
})

test('rejects files that are not collection backups', async () => {
  const collection = await load()
  assert.throws(() => collection.importCollection('not json'), /not valid JSON/)
  assert.throws(() => collection.importCollection('{"records":[]}'), /not a supported/)
})

test('merge adds to the collection and replace swaps it', async () => {
  store.set(KEY, JSON.stringify({ version: 2, records: [{ name: 'mew', owned: true }] }))
  const collection = await load()
  collection.importCollection(backup([{ name: 'pikachu', owned: true }]), 'merge')
  assert.deepEqual(stored(), ['mew', 'pikachu'])
  collection.importCollection(backup([{ name: 'eevee', owned: true }]), 'replace')
  assert.deepEqual(stored(), ['eevee'])
})

test('an export can be imported again', async () => {
  store.set(KEY, JSON.stringify({ version: 2, records: [{ name: 'mew', owned: true }] }))
  const collection = await load()
  const exported = JSON.stringify(collection.exportCollection())
  collection.importCollection(backup([]), 'replace')
  assert.deepEqual(stored(), [])
  collection.importCollection(exported)
  assert.deepEqual(stored(), ['mew'])
})
