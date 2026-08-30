'use client'

import { useRef, useState } from 'react'

const TARGET_CHARS = 340000
const HARD_MAX_CHARS = 460000

function encodeCanvas(canvas: HTMLCanvasElement, quality: number) {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp;base64,')) return webp
  return canvas.toDataURL('image/jpeg', quality)
}

async function compressHeroImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read this image.'))
      img.src = objectUrl
    })

    let maxDimension = 1800
    let quality = 0.86
    let last = ''

    for (let attempt = 0; attempt < 28; attempt += 1) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Image processing is not available on this device.')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(image, 0, 0, width, height)
      last = encodeCanvas(canvas, quality)

      if (last.length <= TARGET_CHARS) return last

      if (quality > 0.5) {
        quality = Math.max(0.48, quality - 0.07)
      } else {
        maxDimension = Math.max(900, Math.round(maxDimension * 0.86))
        quality = 0.78
      }
    }

    if (last.length <= HARD_MAX_CHARS) return last
    throw new Error('Could not compress this image enough. Try another photo.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function HeroImageEditor({ initialImageUrl }: { initialImageUrl: string }) {
  const [preview, setPreview] = useState(initialImageUrl)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function chooseFile(file?: File) {
    if (!file) return
    setBusy(true)
    setStatus('Preparing image…')
    try {
      const compressed = await compressHeroImage(file)
      setPendingImage(compressed)
      setPreview(compressed)
      setStatus('Preview ready. Tap Save hero image.')
    } catch (error) {
      setPendingImage(null)
      setStatus(error instanceof Error ? error.message : 'Could not prepare image.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!pendingImage) {
      setStatus('Choose a new image first.')
      return
    }

    setBusy(true)
    setStatus('Saving…')
    try {
      const res = await fetch('/api/admin/hero-image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: pendingImage })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save hero image.')
      setPendingImage(null)
      setStatus('Hero image saved ✓')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save hero image.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setStatus('Removing…')
    try {
      const res = await fetch('/api/admin/hero-image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not remove hero image.')
      setPreview('')
      setPendingImage(null)
      if (fileRef.current) fileRef.current.value = ''
      setStatus('Hero image removed ✓')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not remove hero image.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="heroImageAdmin">
    <div className="heroImageAdminPreview">
      {preview ? <img src={preview} alt="Homepage hero preview" /> : <div className="heroImageAdminEmpty"><b>No hero image</b><span>The homepage will use the cream background until you upload one.</span></div>}
      {preview && <div className="heroImageAdminOverlay"><span>Fresh flavors,</span><em>made for your moment.</em></div>}
    </div>

    <div className="heroImageAdminControls">
      <label>Home hero photo
        <input ref={fileRef} type="file" accept="image/*" disabled={busy} onChange={event => chooseFile(event.target.files?.[0])}/>
      </label>
      <small>Upload from your phone. The photo is compressed automatically before saving and used as the background behind “Fresh flavors…”.</small>
      <div className="heroImageAdminActions">
        <button type="button" className="adminPrimary" disabled={busy || !pendingImage} onClick={save}>{busy ? 'Please wait…' : 'Save hero image'}</button>
        {preview && <button type="button" className="heroImageRemove" disabled={busy} onClick={remove}>Remove image</button>}
      </div>
      <div className="heroImageAdminStatus">{status}</div>
    </div>
  </div>
}
