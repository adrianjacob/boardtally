import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Player, Score, PlayerStats, GameStats } from '../types'

export function useGameData() {
  const [scores, setScores] = useState<Score[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to scores collection (real-time updates)
  useEffect(() => {
    const scoresQuery = query(collection(db, 'scores'), orderBy('date', 'desc'))

    const unsubscribe = onSnapshot(scoresQuery, (snapshot) => {
      const newScores = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Score[]
      setScores(newScores)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Subscribe to players collection (real-time updates)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'players'), (snapshot) => {
      const newPlayers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[]
      setPlayers(newPlayers)
    })

    return () => unsubscribe()
  }, [])

  // Create players lookup map
  const playersMap = useMemo(
    () => new Map<string, Player>(players.map((p) => [p.id, p])),
    [players]
  )

  // Calculate player stats
  const playerStats = useMemo((): PlayerStats[] => {
    const statsMap = new Map<
      string,
      { gamesPlayed: number; wins: number; lastPlayed: string }
    >()

    // Initialize stats for all players
    for (const player of players) {
      statsMap.set(player.id, { gamesPlayed: 0, wins: 0, lastPlayed: '' })
    }

    // Process all games
    for (const game of scores) {
      for (const p of game.players) {
        const stats = statsMap.get(p.playerId)
        if (stats) {
          stats.gamesPlayed++
          if (p.isWinner) stats.wins++
          if (!stats.lastPlayed || game.date > stats.lastPlayed) {
            stats.lastPlayed = game.date
          }
        }
      }
    }

    // Convert to array and calculate win ratio
    // Sort: active players by win ratio, then new players (0 games) at the end
    return players
      .map((player) => {
        const stats = statsMap.get(player.id)!
        return {
          player,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          winRatio: stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0,
          lastPlayed: stats.lastPlayed,
        }
      })
      .sort((a, b) => {
        // Players with games come first
        if (a.gamesPlayed > 0 && b.gamesPlayed === 0) return -1
        if (a.gamesPlayed === 0 && b.gamesPlayed > 0) return 1
        // Among players with games, sort by win ratio then games played
        if (a.gamesPlayed > 0 && b.gamesPlayed > 0) {
          return b.winRatio - a.winRatio || b.gamesPlayed - a.gamesPlayed
        }
        // New players sorted alphabetically
        return a.player.name.localeCompare(b.player.name)
      })
  }, [players, scores])

  // Calculate game stats (sorted by most played)
  const gameStats = useMemo((): GameStats[] => {
    const statsMap = new Map<
      number,
      { gameName: string; timesPlayed: number; lastPlayed: string }
    >()

    for (const game of scores) {
      const existing = statsMap.get(game.gameId)
      if (existing) {
        existing.timesPlayed++
        if (game.date > existing.lastPlayed) {
          existing.lastPlayed = game.date
        }
      } else {
        statsMap.set(game.gameId, {
          gameName: game.gameName,
          timesPlayed: 1,
          lastPlayed: game.date,
        })
      }
    }

    return Array.from(statsMap.entries())
      .map(([gameId, stats]) => {
        const date = new Date(stats.lastPlayed)
        const now = new Date()
        const diffDays = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          gameId,
          gameName: stats.gameName,
          timesPlayed: stats.timesPlayed,
          lastPlayed: stats.lastPlayed,
          daysAgo: diffDays,
        }
      })
      .sort((a, b) => b.timesPlayed - a.timesPlayed)
  }, [scores])

  return {
    scores,
    players,
    playersMap,
    playerStats,
    gameStats,
    loading,
  }
}

