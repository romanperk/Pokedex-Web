import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { titleCase } from '../../lib/pokeapi/client'
import { toggleSavedPokemon, useSavedPokemon } from './savedPokemon'

export function SavePokemonButton({ name }: { name: string }) {
  const saved = useSavedPokemon().includes(name.toLowerCase())
  const [message, setMessage] = useState('')
  const label = titleCase(name)
  function toggle() {
    const result = toggleSavedPokemon(name)
    setMessage(
      !result.persisted
        ? 'Browser storage is unavailable. Your change remains for this session only.'
        : result.saved
          ? `${label} marked as owned on this device.`
          : `${label} removed from your collection.`,
    )
  }
  return (
    <>
      <button
        className={`button save-pokemon ${saved ? 'save-pokemon-owned' : ''}`}
        type="button"
        aria-pressed={saved}
        aria-label={`${label} owned`}
        onClick={toggle}
      >
        {saved ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        <span>{saved ? 'Owned' : 'Mark owned'}</span>
      </button>
      <span className="visually-hidden" aria-live="polite">
        {message}
      </span>
    </>
  )
}
