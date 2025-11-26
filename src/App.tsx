import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameData } from "./hooks/useGameData";
import { GameThumbnail } from "./components/GameThumbnail";
import { AddScore } from "./components/AddScore";
import { AddPlayer } from "./components/AddPlayer";
import { EditScore } from "./components/EditScore";
import { EditPlayer } from "./components/EditPlayer";
import { formatRelativeDate, formatDaysAgo } from "./utils/date";
import type { Score, Player } from "./types";
import "./App.css";

const ITEMS_PER_PAGE = 20;

function App() {
  const navigate = useNavigate();
  const { scores, players, playersMap, playerStats, gameStats, loading } =
    useGameData();
  const [showAddScore, setShowAddScore] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Pagination state for each list
  const [visibleScores, setVisibleScores] = useState(ITEMS_PER_PAGE);
  const [visiblePlayerStats, setVisiblePlayerStats] = useState(ITEMS_PER_PAGE);
  const [visibleGameStats, setVisibleGameStats] = useState(ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="app">
        <div className="logo-title">
          <span className="app-logo">🎲</span>
          <h1>BoardTally</h1>
        </div>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-title">
          <span className="app-logo">🎲</span>
          <h1>BoardTally</h1>
        </div>
        <div className="header-actions">
          <button
            className="add-btn add-player-btn"
            onClick={() => setShowAddPlayer(true)}
          >
            + Player
          </button>
          <button
            className="add-btn add-score-btn"
            onClick={() => setShowAddScore(true)}
          >
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
          <h2>SCORES</h2>
          {scores.length === 0 ? (
            <p className="empty-state">No games recorded yet.</p>
          ) : (
            <>
              <ul className="scores-list">
                {scores.slice(0, visibleScores).map((game) => (
                  <li
                    key={game.id}
                    className="score-item score-item-clickable"
                    onClick={() => setEditingScore(game)}
                  >
                    <GameThumbnail
                      gameId={game.gameId}
                      gameName={game.gameName}
                    />
                    <div className="score-content">
                      <div className="game-header">
                        <span className="game-name">{game.gameName}</span>
                        <span className="game-date">
                          {formatRelativeDate(game.date)}
                        </span>
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
                            if (a.isWinner !== b.isWinner)
                              return a.isWinner ? -1 : 1;
                            if (a.score === null && b.score === null) return 0;
                            if (a.score === null) return 1;
                            if (b.score === null) return -1;
                            return b.score - a.score;
                          })
                          .map((p) => {
                            const player = playersMap.get(p.playerId);
                            return (
                              <span
                                key={p.playerId}
                                className={`player ${
                                  p.isWinner ? "winner" : ""
                                }`}
                                style={{ borderColor: player?.color }}
                              >
                                {player?.name}
                                {p.score !== null ? ` (${p.score})` : ""}
                                {p.isWinner && " 🏆"}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {visibleScores < scores.length && (
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleScores((v) => v + ITEMS_PER_PAGE)}
                >
                  Load 20 more ({scores.length - visibleScores} remaining)
                </button>
              )}
            </>
          )}
        </div>
        <aside className="sidebar player-stats-sidebar">
          <h2>Players</h2>
          {playerStats.length === 0 ? (
            <p className="empty-state">No player stats yet.</p>
          ) : (
            <>
              <ul className="stats-list">
                {playerStats.slice(0, visiblePlayerStats).map((s) => (
                  <li
                    key={s.player.id}
                    className={`stat-item stat-item-clickable ${
                      s.gamesPlayed === 0 ? "stat-item-new" : ""
                    }`}
                    onClick={() => setEditingPlayer(s.player)}
                  >
                    <div className="stat-header">
                      <span
                        className="stat-name"
                        style={{ borderColor: s.player.color }}
                      >
                        {s.player.name}
                      </span>
                      {s.gamesPlayed > 0 ? (
                        <div className="stat-scores">
                          <span className="stat-winrate">
                            {Math.round(s.winRatio * 100)}%
                          </span>
                          <span
                            className={`stat-score ${
                              s.performanceScore >= 100
                                ? "score-positive"
                                : "score-negative"
                            }`}
                            title={`Performance Score: ${Math.round(
                              s.performanceScore
                            )}\n\nActual wins: ${
                              s.wins
                            }\nExpected wins: ${s.expectedWins.toFixed(
                              2
                            )}\n\nScore = (Wins ÷ Expected) × 100\n\n100 = average luck\n>100 = winning more than expected\n<100 = winning less than expected\n\nExpected wins accounts for game size (1÷players per game)`}
                          >
                            {Math.round(s.performanceScore)}
                          </span>
                        </div>
                      ) : (
                        <span className="stat-new-badge">New</span>
                      )}
                    </div>
                    {s.form.length > 0 && (
                      <div className="form-guide">
                        {[...s.form].reverse().map((result, i) => (
                          <span
                            key={i}
                            className={`form-badge form-${result.toLowerCase()}`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="stat-details">
                      {s.gamesPlayed > 0 ? (
                        <>
                          <span>
                            {s.gamesPlayed}{" "}
                            {s.gamesPlayed === 1 ? "play" : "plays"}
                          </span>
                          <span className="stat-date">
                            Last: {formatRelativeDate(s.lastPlayed)}
                          </span>
                        </>
                      ) : (
                        <span className="stat-no-games">No games yet</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {visiblePlayerStats < playerStats.length && (
                <button
                  className="load-more-btn"
                  onClick={() =>
                    setVisiblePlayerStats((v) => v + ITEMS_PER_PAGE)
                  }
                >
                  Load 20 more ({playerStats.length - visiblePlayerStats}{" "}
                  remaining)
                </button>
              )}
            </>
          )}
        </aside>

        <aside className="sidebar game-stats-sidebar">
          <h2>Games</h2>
          {gameStats.length === 0 ? (
            <p className="empty-state">No games played yet.</p>
          ) : (
            <>
              <ul className="game-stats-list">
                {gameStats.slice(0, visibleGameStats).map((g) => (
                  <li
                    key={g.gameId}
                    className="game-stat-item game-stat-item-clickable"
                    onClick={() => navigate(`/${g.gameId}`)}
                  >
                    <GameThumbnail
                      gameId={g.gameId}
                      gameName={g.gameName}
                      size="small"
                    />
                    <div className="game-stat-content">
                      <span className="game-stat-name">{g.gameName}</span>
                      <div className="game-stat-details">
                        <span className="game-stat-plays">
                          {g.timesPlayed} play{g.timesPlayed !== 1 ? "s" : ""}
                        </span>
                        <span className="game-stat-last">
                          {formatDaysAgo(g.lastPlayed)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {visibleGameStats < gameStats.length && (
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleGameStats((v) => v + ITEMS_PER_PAGE)}
                >
                  Load 20 more ({gameStats.length - visibleGameStats} remaining)
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
