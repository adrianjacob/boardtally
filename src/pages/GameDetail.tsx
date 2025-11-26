import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGameData } from '../hooks/useGameData'
import { GameThumbnail } from '../components/GameThumbnail'
import { formatRelativeDate, formatDaysAgo } from '../utils/date'

const ITEMS_PER_PAGE = 10

export function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>()
  const { scores, playersMap, loading } = useGameData()
  const [visiblePlays, setVisiblePlays] = useState(ITEMS_PER_PAGE)

  const gameIdNum = Number(gameId)

  // Filter scores for this specific game
  const gameScores = useMemo(
    () => scores.filter((s) => s.gameId === gameIdNum),
    [scores, gameIdNum]
  )

  // Get game info from first score
  const gameInfo = gameScores[0]

  // Calculate stats for this game
  const stats = useMemo(() => {
    if (gameScores.length === 0) return null

    const timesPlayed = gameScores.length
    const lastPlayed = gameScores[0].date // Already sorted by date desc
    const firstPlayed = gameScores[gameScores.length - 1].date

    // Calculate player wins for this game
    const playerWins = new Map<string, number>()
    for (const score of gameScores) {
      for (const p of score.players) {
        if (p.isWinner) {
          playerWins.set(p.playerId, (playerWins.get(p.playerId) || 0) + 1)
        }
      }
    }

    // Sort by most wins
    const topPlayers = Array.from(playerWins.entries())
      .map(([playerId, wins]) => ({
        player: playersMap.get(playerId),
        wins,
      }))
      .filter((p) => p.player)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5)

    return {
      timesPlayed,
      lastPlayed,
      firstPlayed,
      topPlayers,
    }
  }, [gameScores, playersMap])

  if (loading) {
    return (
      <div className="game-detail">
        <p className="loading">Loading...</p>
      </div>
    )
  }

  if (!gameInfo) {
    return (
      <div className="game-detail">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <p className="empty-state">Game not found or no plays recorded.</p>
      </div>
    )
  }

  return (
    <div className="game-detail">
      <Link to="/" className="back-link">
        ← Back to Home
      </Link>

      <header className="game-detail-header">
        <GameThumbnail gameId={gameIdNum} gameName={gameInfo.gameName} size="large" />
        <div className="game-detail-info">
          <h1>{gameInfo.gameName}</h1>
          {stats && (
            <div className="game-detail-stats">
              <div className="detail-stat">
                <span className="detail-stat-value">{stats.timesPlayed}</span>
                <span className="detail-stat-label">
                  {stats.timesPlayed === 1 ? 'Play' : 'Plays'}
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-value">{formatDaysAgo(stats.lastPlayed)}</span>
                <span className="detail-stat-label">Last Played</span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-value">{formatRelativeDate(stats.firstPlayed)}</span>
                <span className="detail-stat-label">First Played</span>
              </div>
            </div>
          )}
          {stats && stats.topPlayers.length > 0 && (
            <div className="game-detail-winners">
              <span className="winners-label">Top Winners:</span>
              {stats.topPlayers.map(({ player, wins }) => (
                <span
                  key={player!.id}
                  className="winner-badge"
                  style={{ borderColor: player!.color }}
                >
                  {player!.name} ({wins} 🏆)
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="game-detail-plays">
        <h2>Play History</h2>
        {gameScores.length === 0 ? (
          <p className="empty-state">No plays recorded yet.</p>
        ) : (
          <>
            <ul className="scores-list">
              {gameScores.slice(0, visiblePlays).map((game) => (
                <li key={game.id} className="score-item score-item-compact">
                  <div className="score-content">
                    <div className="game-header">
                      <span className="game-date-large">{formatRelativeDate(game.date)}</span>
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
                        .sort((a, b) => {
                          // Winners first, then by score (nulls last)
                          if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1
                          if (a.score === null && b.score === null) return 0
                          if (a.score === null) return 1
                          if (b.score === null) return -1
                          return b.score - a.score
                        })
                        .map((p) => {
                          const player = playersMap.get(p.playerId)
                          return (
                            <span
                              key={p.playerId}
                              className={`player ${p.isWinner ? 'winner' : ''}`}
                              style={{ borderColor: player?.color }}
                            >
                              {player?.name}{p.score !== null ? ` (${p.score})` : ''}
                              {p.isWinner && ' 🏆'}
                            </span>
                          )
                        })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {visiblePlays < gameScores.length && (
              <button
                className="load-more-btn"
                onClick={() => setVisiblePlays((v) => v + ITEMS_PER_PAGE)}
              >
                Load 10 more ({gameScores.length - visiblePlays} remaining)
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}

