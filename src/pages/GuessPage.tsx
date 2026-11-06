import { useEffect, useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { ErrorState, HaloArt, LoadingState } from '../components/ui'
import { readGuessBest, saveGuessBest } from '../features/pokedex/guessScore'
import { usePokemonDirectory } from '../features/pokedex/usePokemonPages'
import {
  friendlyError,
  pokemonArtworkById,
  pokemonIdFromUrl,
  SPECIES_COUNT,
  titleCase,
  typeVars,
} from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'

const CHOICES = 4

type Round = { options: number[]; answer: number }

function newRound(): Round {
  const picks = new Set<number>()
  while (picks.size < CHOICES) picks.add(Math.floor(Math.random() * SPECIES_COUNT))
  const options = [...picks]
  return { options, answer: options[Math.floor(Math.random() * CHOICES)] }
}

export function GuessPage() {
  usePageTitle('Guess the Pokémon')
  const directory = usePokemonDirectory(true)
  const [round, setRound] = useState(newRound)
  const [picked, setPicked] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(readGuessBest)

  useEffect(() => saveGuessBest(best), [best])

  // The directory lists species in Pokédex order, ahead of alternate forms.
  const resource = (index: number) => directory.data?.results[index]
  const answer = resource(round.answer)
  const answerId = answer ? pokemonIdFromUrl(answer.url) : null
  const answered = picked !== null
  const correct = picked === round.answer

  function choose(option: number) {
    if (answered) return
    setPicked(option)
    if (option === round.answer) {
      const next = streak + 1
      setStreak(next)
      setBest((value) => Math.max(value, next))
    } else {
      setStreak(0)
    }
  }

  function nextRound() {
    setRound(newRound())
    setPicked(null)
  }

  return (
    <main className="page guess">
      <TopBar title="Guess the Pokémon" back="/tools" search={false} />
      <div className="page-body">
        {directory.isLoading && <LoadingState label="Loading Pokémon" />}
        {directory.isError && !directory.data && (
          <ErrorState
            message={friendlyError(directory.error, 'The quiz')}
            onRetry={() => void directory.refetch()}
          />
        )}
        {answer && answerId != null && (
          <>
            <div className="guess-stage hero-plate" style={typeVars('water')}>
              <div className="guess-score">
                <span>Streak {streak}</span>
                <span>Best {best}</span>
              </div>
              <HaloArt
                className={answered ? '' : 'guess-hidden'}
                src={pokemonArtworkById(answerId)}
                alt={answered ? `${titleCase(answer.name)} official artwork` : 'Mystery Pokémon'}
              />
              <p className="guess-result" aria-live="polite">
                {answered ? (
                  <>
                    {correct ? 'Correct, it’s ' : 'It’s '}
                    <Link to={`/pokemon/${answerId}`}>{titleCase(answer.name)}</Link>
                  </>
                ) : (
                  'Who is this?'
                )}
              </p>
            </div>
            <div className="guess-options">
              {round.options.map((option) => {
                const isAnswer = option === round.answer
                return (
                  <button
                    key={option}
                    type="button"
                    className="guess-option"
                    disabled={answered}
                    data-state={
                      answered && isAnswer
                        ? 'correct'
                        : answered && option === picked
                          ? 'wrong'
                          : undefined
                    }
                    onClick={() => choose(option)}
                  >
                    {titleCase(resource(option)?.name ?? '')}
                    {answered && isAnswer && <Check size={18} aria-hidden="true" />}
                    {answered && !isAnswer && option === picked && (
                      <X size={18} aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="button button-primary button-block guess-next"
              disabled={!answered}
              onClick={nextRound}
            >
              Next Pokémon
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </main>
  )
}
