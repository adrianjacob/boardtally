import { useState, useMemo } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Player, Score } from '../types'
import baseGames from '../../data/base.json'
import expansionsData from '../../data/expansions.json'
import './AddScore.css'

interface Game {
  id: number
  name: string
}

interface PlayerScore {
  playerId: string
  score: number | null
  isWinner: boolean
}

interface EditScoreProps {
  score: Score
  players: Player[]
  onClose: () => void
  onUpdated: () => void
}

export function EditScore({ score, players, onClose, onUpdated }: EditScoreProps) {
  // Initialize state from existing score
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(
    score.players.map(p => p.playerId)
  )
  const [playerScores, setPlayerScores] = useState<Record<string, number | null>>(
    Object.fromEntries(score.players.map(p => [p.playerId, p.score]))
  )
  const [winnerIds, setWinnerIds] = useState<string[]>(
    score.players.filter(p => p.isWinner).map(p => p.playerId)
  )
  
  const [gameSearch, setGameSearch] = useState('')
  const [selectedGame, setSelectedGame] = useState<Game | null>({
    id: score.gameId,
    name: score.gameName
  })
  
  const [expansionSearch, setExpansionSearch] = useState('')
  const [selectedExpansions, setSelectedExpansions] = useState<Game[]>(
    score.expansions?.map(e => ({ id: e.id, name: e.name })) || []
  )
  
  const [date, setDate] = useState(score.date)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter base games (min 2 characters)
  const filteredGames = useMemo(() => {
    if (gameSearch.length < 2) return []
    const search = gameSearch.toLowerCase()
    return (baseGames as Game[])
      .filter(g => g.name.toLowerCase().includes(search))
      .slice(0, 20)
  }, [gameSearch])

  // Filter expansions (min 2 characters)
  const filteredExpansions = useMemo(() => {
    if (expansionSearch.length < 2) return []
    const search = expansionSearch.toLowerCase()
    return (expansionsData as Game[])
      .filter(g => g.name.toLowerCase().includes(search))
      .filter(g => !selectedExpansions.some(e => e.id === g.id))
      .slice(0, 20)
  }, [expansionSearch, selectedExpansions])

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        const newPlayers = prev.filter(id => id !== playerId)
        setPlayerScores(scores => {
          const { [playerId]: _, ...rest } = scores
          return rest
        })
        setWinnerIds(ids => ids.filter(id => id !== playerId))
        return newPlayers
      } else {
        setPlayerScores(scores => ({ ...scores, [playerId]: null }))
        return [...prev, playerId]
      }
    })
  }

  const toggleWinner = (playerId: string) => {
    setWinnerIds(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const updateScore = (playerId: string, value: string) => {
    // Allow empty string to represent null (no score)
    const score = value === '' ? null : parseInt(value) || 0
    setPlayerScores(prev => ({ ...prev, [playerId]: score }))
  }

  const selectGame = (game: Game) => {
    setSelectedGame(game)
    setGameSearch('')
  }

  const addExpansion = (expansion: Game) => {
    setSelectedExpansions(prev => [...prev, expansion])
    setExpansionSearch('')
  }

  const removeExpansion = (expansionId: number) => {
    setSelectedExpansions(prev => prev.filter(e => e.id !== expansionId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!selectedGame) {
      setError('Please select a game')
      return
    }
    if (selectedPlayers.length < 1) {
      setError('Please select at least one player')
      return
    }
    if (winnerIds.length === 0) {
      setError('Please select at least one winner')
      return
    }
    if (!date) {
      setError('Please select a date')
      return
    }

    setIsSubmitting(true)

    try {
      const playerResults: PlayerScore[] = selectedPlayers.map(playerId => ({
        playerId,
        score: playerScores[playerId] ?? null,
        isWinner: winnerIds.includes(playerId),
      }))

      await updateDoc(doc(db, 'scores', score.id), {
        date,
        gameId: selectedGame.id,
        gameName: selectedGame.name,
        expansions: selectedExpansions.map(e => ({ id: e.id, name: e.name })),
        players: playerResults,
      })

      onUpdated()
      onClose()
    } catch (err) {
      setError('Failed to update score. Please try again.')
      console.error('Error updating score:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="add-score-overlay">
      <div className="add-score-modal">
        <div className="modal-header">
          <h2>Edit Game Score</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Date */}
          <div className="form-section">
            <label>Date *</label>
            <input
              type="date"
              className="date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Game Selection */}
          <div className="form-section">
            <label>Game *</label>
            {selectedGame ? (
              <div className="selected-game">
                <span>{selectedGame.name}</span>
                <button type="button" onClick={() => setSelectedGame(null)}>×</button>
              </div>
            ) : (
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search for a game (min 2 letters)..."
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                />
                {filteredGames.length > 0 && (
                  <ul className="search-results">
                    {filteredGames.map(game => (
                      <li key={game.id} onClick={() => selectGame(game)}>
                        {game.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Expansions */}
          <div className="form-section">
            <label>Expansions (optional)</label>
            {selectedExpansions.length > 0 && (
              <div className="selected-expansions">
                {selectedExpansions.map(exp => (
                  <span key={exp.id} className="expansion-tag">
                    {exp.name}
                    <button type="button" onClick={() => removeExpansion(exp.id)}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="search-container">
              <input
                type="text"
                placeholder="Search for expansions..."
                value={expansionSearch}
                onChange={(e) => setExpansionSearch(e.target.value)}
              />
              {filteredExpansions.length > 0 && (
                <ul className="search-results">
                  {filteredExpansions.map(exp => (
                    <li key={exp.id} onClick={() => addExpansion(exp)}>
                      {exp.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Player Selection */}
          <div className="form-section">
            <label>Players *</label>
            <div className="player-grid">
              {players.map(player => (
                <button
                  key={player.id}
                  type="button"
                  className={`player-btn ${selectedPlayers.includes(player.id) ? 'selected' : ''}`}
                  style={{ 
                    borderColor: player.color,
                    backgroundColor: selectedPlayers.includes(player.id) ? `${player.color}20` : undefined
                  }}
                  onClick={() => togglePlayer(player.id)}
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scores & Winner */}
          {selectedPlayers.length > 0 && (
            <div className="form-section">
              <label>Scores & Winner *</label>
              <div className="scores-list">
                {selectedPlayers.map(playerId => {
                  const player = players.find(p => p.id === playerId)
                  if (!player) return null
                  return (
                    <div key={playerId} className="score-row">
                      <span 
                        className="player-name"
                        style={{ borderColor: player.color }}
                      >
                        {player.name}
                      </span>
                      <input
                        type="number"
                        value={playerScores[playerId] ?? ''}
                        onChange={(e) => updateScore(playerId, e.target.value)}
                        className="score-input"
                        placeholder="—"
                      />
                      <button
                        type="button"
                        className={`winner-btn ${winnerIds.includes(playerId) ? 'is-winner' : ''}`}
                        onClick={() => toggleWinner(playerId)}
                      >
                        {winnerIds.includes(playerId) ? '🏆 Winner' : 'Set Winner'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
