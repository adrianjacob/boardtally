import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Player } from '../types'
import './AddScore.css'

interface EditPlayerProps {
  player: Player
  onClose: () => void
  onUpdated: () => void
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#92400e', // brown
  '#1f2937', // dark gray / black
  '#64748b', // slate
  '#84cc16', // lime
]

export function EditPlayer({ player, onClose, onUpdated }: EditPlayerProps) {
  const [name, setName] = useState(player.name)
  const [color, setColor] = useState(player.color)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a name')
      return
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    // Check if anything changed
    if (trimmedName === player.name && color === player.color) {
      onClose()
      return
    }

    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, 'players', player.id), {
        name: trimmedName,
        color,
      })

      onUpdated()
      onClose()
    } catch (err) {
      setError('Failed to update player. Please try again.')
      console.error('Error updating player:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="add-score-overlay">
      <div className="add-score-modal add-player-modal">
        <div className="modal-header">
          <h2>Edit Player</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label>Name *</label>
            <input
              type="text"
              className="player-name-input"
              placeholder="Enter player name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={30}
            />
          </div>

          <div className="form-section">
            <label>Color *</label>
            <div className="color-grid">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-btn ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
            <div className="color-preview">
              <span className="preview-label">Preview:</span>
              <span
                className="preview-badge"
                style={{ borderColor: color, backgroundColor: `${color}20` }}
              >
                {name || 'Player Name'}
              </span>
            </div>
          </div>

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
