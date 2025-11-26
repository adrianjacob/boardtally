import { useEffect, useState } from 'react'
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'

interface GameThumbnailProps {
  gameId: number
  gameName: string
  size?: 'small' | 'medium' | 'large'
}

export function GameThumbnail({ gameId, gameName, size = 'medium' }: GameThumbnailProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [url, setUrl] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const tryLoadImage = async () => {
      setStatus('loading')

      // Try Firebase Storage first
      try {
        const imageRef = ref(storage, `game-images/${gameId}.jpg`)
        const storageUrl = await getDownloadURL(imageRef)
        if (!cancelled) {
          setUrl(storageUrl)
          setStatus('loaded')
          return
        }
      } catch {
        // Try local fallback
        const localUrl = `/game-images/${gameId}.jpg`
        if (!cancelled) {
          setUrl(localUrl)
          // Check if local image exists by trying to load it
          const img = new Image()
          img.onload = () => {
            if (!cancelled) setStatus('loaded')
          }
          img.onerror = () => {
            if (!cancelled) setStatus('error')
          }
          img.src = localUrl
        }
      }
    }

    tryLoadImage()
    return () => {
      cancelled = true
    }
  }, [gameId, retryCount])

  // Retry loading every 3 seconds if image not found (Cloud Function might be fetching it)
  useEffect(() => {
    if (status === 'error') {
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status, retryCount])

  const sizeClass = `game-thumbnail-${size}`

  if (status === 'loading' || status === 'error') {
    return (
      <div className={`game-thumbnail game-thumbnail-loading ${sizeClass}`}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return <img src={url!} alt={gameName} className={`game-thumbnail ${sizeClass}`} />
}

