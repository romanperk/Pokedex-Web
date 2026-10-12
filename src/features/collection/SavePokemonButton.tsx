import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useSavedPokemon, toggleSavedPokemon } from './savedPokemon'

export function SavePokemonButton({ name }: { name: string }) {
  const saved = useSavedPokemon().includes(name.toLowerCase())
  const [message, setMessage] = useState('')
  function toggle() {
    const result = toggleSavedPokemon(name)
    setMessage(
      !result.persisted
        ? 'Browser storage is unavailable. Your change remains for this session only.'
        : result.saved
          ? `${name} marked as owned on this device.`
          : `${name} removed from your owned collection.`,
    )
  }
  return (
    <>
      <button
        className="save-pokemon"
        type="button"
        aria-label={saved ? `Remove ${name} from your owned collection` : `Mark ${name} as owned`}
        aria-pressed={saved}
        onClick={toggle}
      >
        {saved ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
        <span>{saved ? 'Owned' : 'Mark owned'}</span>
      </button>
      <span className="visually-hidden" aria-live="polite">
        {message}
      </span>
    </>
  )
}
