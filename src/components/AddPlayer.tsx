import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { generateId } from '../utils/id'
import './AddScore.css' // Reuse modal styles

interface AddPlayerProps {
  onClose: () => void
  onPlayerAdded: () => void
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

export function AddPlayer({ onClose, onPlayerAdded }: AddPlayerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
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

    setIsSubmitting(true)

    try {
      const playerId = generateId()
      await setDoc(doc(db, 'players', playerId), {
        name: trimmedName,
        color,
      })

      onPlayerAdded()
      onClose()
    } catch (err) {
      setError('Failed to add player. Please try again.')
      console.error('Error adding player:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="add-score-overlay">
      <div className="add-score-modal add-player-modal">
        <div className="modal-header">
          <h2>Add New Player</h2>
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
              {isSubmitting ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

