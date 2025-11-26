export interface Player {
  id: string
  name: string
  color: string
}

export interface GamePlayer {
  playerId: string
  score: number | null
  isWinner: boolean
}

export interface Score {
  id: string
  date: string
  gameId: number
  gameName: string
  expansions: { id: number; name: string }[]
  players: GamePlayer[]
}

export interface PlayerStats {
  player: Player
  gamesPlayed: number
  wins: number
  winRatio: number
  expectedWins: number // Sum of 1/players for each game
  performanceScore: number // (wins / expectedWins) * 100
  lastPlayed: string
  form: ('W' | 'L')[] // Last 10 games, most recent first
}

export interface GameStats {
  gameId: number
  gameName: string
  timesPlayed: number
  lastPlayed: string
  daysAgo: number
}

