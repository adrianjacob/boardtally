export interface Player {
  id: string
  name: string
  color: string
}

export interface GamePlayer {
  playerId: string
  score: number
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
  lastPlayed: string
}

export interface GameStats {
  gameId: number
  gameName: string
  timesPlayed: number
  lastPlayed: string
  daysAgo: number
}

