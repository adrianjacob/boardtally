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
      { gamesPlayed: number; wins: number; expectedWins: number; lastPlayed: string; form: ('W' | 'L')[] }
    >()

    // Initialize stats for all players
    for (const player of players) {
      statsMap.set(player.id, { gamesPlayed: 0, wins: 0, expectedWins: 0, lastPlayed: '', form: [] })
    }

    // Process all games (scores are already sorted by date desc)
    for (const game of scores) {
      const numPlayers = game.players.length
      const expectedWinChance = numPlayers > 0 ? 1 / numPlayers : 0

      for (const p of game.players) {
        const stats = statsMap.get(p.playerId)
        if (stats) {
          stats.gamesPlayed++
          stats.expectedWins += expectedWinChance
          if (p.isWinner) stats.wins++
          if (!stats.lastPlayed || game.date > stats.lastPlayed) {
            stats.lastPlayed = game.date
          }
          // Add to form guide (limit to 10, most recent first)
          if (stats.form.length < 10) {
            stats.form.push(p.isWinner ? 'W' : 'L')
          }
        }
      }
    }

    // Convert to array and calculate win ratio + performance score
    // Sort: active players by performance score, then new players (0 games) at the end
    return players
      .map((player) => {
        const stats = statsMap.get(player.id)!
        const performanceScore = stats.expectedWins > 0 
          ? (stats.wins / stats.expectedWins) * 100 
          : 0
        return {
          player,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          winRatio: stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0,
          expectedWins: stats.expectedWins,
          performanceScore,
          lastPlayed: stats.lastPlayed,
          form: stats.form,
        }
      })
      .sort((a, b) => {
        // Players with games come first
        if (a.gamesPlayed > 0 && b.gamesPlayed === 0) return -1
        if (a.gamesPlayed === 0 && b.gamesPlayed > 0) return 1
        // Among players with games, sort by performance score then games played
        if (a.gamesPlayed > 0 && b.gamesPlayed > 0) {
          return b.performanceScore - a.performanceScore || b.gamesPlayed - a.gamesPlayed
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

