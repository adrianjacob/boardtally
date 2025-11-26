import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGameData } from './hooks/useGameData'
import { GameThumbnail } from './components/GameThumbnail'
import { AddScore } from './components/AddScore'
import { AddPlayer } from './components/AddPlayer'
import { EditScore } from './components/EditScore'
import { EditPlayer } from './components/EditPlayer'
import { formatRelativeDate, formatDaysAgo } from './utils/date'
import type { Score, Player } from './types'
import './App.css'

function App() {
  const { scores, players, playersMap, playerStats, gameStats, loading } = useGameData()
  const [showAddScore, setShowAddScore] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [editingScore, setEditingScore] = useState<Score | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  if (loading) {
    return (
      <div className="app">
        <h1>BoardTally</h1>
        <p className="loading">Loading...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>BoardTally</h1>
        <div className="header-actions">
          <button className="add-btn add-player-btn" onClick={() => setShowAddPlayer(true)}>
            + Player
          </button>
          <button className="add-btn add-score-btn" onClick={() => setShowAddScore(true)}>
            + Score
          </button>
        </div>
      </header>

      {showAddScore && (
        <AddScore
          players={players}
          onClose={() => setShowAddScore(false)}
          onScoreAdded={() => {
            // Score is added via Firestore, real-time listener will update UI
          }}
        />
      )}

      {showAddPlayer && (
        <AddPlayer
          onClose={() => setShowAddPlayer(false)}
          onPlayerAdded={() => {
            // Player is added via Firestore, real-time listener will update UI
          }}
        />
      )}

      {editingScore && (
        <EditScore
          score={editingScore}
          players={players}
          onClose={() => setEditingScore(null)}
          onUpdated={() => {
            // Updated via Firestore, real-time listener will update UI
          }}
        />
      )}

      {editingPlayer && (
        <EditPlayer
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onUpdated={() => {
            // Updated via Firestore, real-time listener will update UI
          }}
        />
      )}

      <div className="layout">
        <div className="main-column">
          <h2>Game Feed</h2>
          {scores.length === 0 ? (
            <p className="empty-state">No games recorded yet.</p>
          ) : (
            <ul className="scores-list">
              {scores.map((game, index) => (
                <li key={game.id} className="score-item">
                  <Link to={`/${game.gameId}`} className="game-thumbnail-link">
                    <GameThumbnail
                      gameId={game.gameId}
                      gameName={game.gameName}
                      loading={index < 10 ? 'eager' : 'lazy'}
                    />
                  </Link>
                  <div className="score-content">
                    <div className="game-header">
                      <Link to={`/${game.gameId}`} className="game-name-link">
                        <span className="game-name">{game.gameName}</span>
                      </Link>
                      <div className="game-header-right">
                        <span className="game-date">{formatRelativeDate(game.date)}</span>
                        <button
                          className="edit-btn"
                          onClick={() => setEditingScore(game)}
                          aria-label="Edit score"
                        >
                          ✎
                        </button>
                      </div>
                    </div>
                    {game.expansions && game.expansions.length > 0 && (
                      <div className="expansions">
                        {game.expansions.map((exp) => (
                          <span key={exp.id} className="expansion-badge">
                            + {exp.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="players">
                      {[...game.players]
                        .sort((a, b) => b.score - a.score)
                        .map((p) => {
                          const player = playersMap.get(p.playerId)
                          return (
                            <span
                              key={p.playerId}
                              className={`player ${p.isWinner ? 'winner' : ''}`}
                              style={{ borderColor: player?.color }}
                            >
                              {player?.name} ({p.score})
                              {p.isWinner && ' 🏆'}
                            </span>
                          )
                        })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="sidebar player-stats-sidebar">
          <h2>Player Stats</h2>
          {playerStats.length === 0 ? (
            <p className="empty-state">No player stats yet.</p>
          ) : (
            <ul className="stats-list">
              {playerStats.map((s) => (
                <li key={s.player.id} className={`stat-item ${s.gamesPlayed === 0 ? 'stat-item-new' : ''}`}>
                  <div className="stat-header">
                    <span
                      className="stat-name"
                      style={{ borderColor: s.player.color }}
                    >
                      {s.player.name}
                    </span>
                    <div className="stat-header-right">
                      {s.gamesPlayed > 0 ? (
                        <span className="stat-ratio">
                          {Math.round(s.winRatio * 100)}%
                        </span>
                      ) : (
                        <span className="stat-new-badge">New</span>
                      )}
                      <button
                        className="edit-btn edit-btn-small"
                        onClick={() => setEditingPlayer(s.player)}
                        aria-label="Edit player"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                  <div className="stat-details">
                    {s.gamesPlayed > 0 ? (
                      <>
                        <span>
                          {s.wins}W / {s.gamesPlayed}G
                        </span>
                        <span className="stat-date">Last: {formatRelativeDate(s.lastPlayed)}</span>
                      </>
                    ) : (
                      <span className="stat-no-games">No games yet</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <aside className="sidebar game-stats-sidebar">
          <h2>Game Stats</h2>
          {gameStats.length === 0 ? (
            <p className="empty-state">No games played yet.</p>
          ) : (
            <ul className="game-stats-list">
              {gameStats.map((g, index) => (
                <li key={g.gameId} className="game-stat-item">
                  <Link to={`/${g.gameId}`} className="game-thumbnail-link">
                    <GameThumbnail
                      gameId={g.gameId}
                      gameName={g.gameName}
                      size="small"
                      loading={index < 10 ? 'eager' : 'lazy'}
                    />
                  </Link>
                  <div className="game-stat-content">
                    <Link to={`/${g.gameId}`} className="game-stat-name-link">
                      <span className="game-stat-name">{g.gameName}</span>
                    </Link>
                    <div className="game-stat-details">
                      <span className="game-stat-plays">
                        {g.timesPlayed} play{g.timesPlayed !== 1 ? 's' : ''}
                      </span>
                      <span className="game-stat-last">{formatDaysAgo(g.lastPlayed)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}

export default App
