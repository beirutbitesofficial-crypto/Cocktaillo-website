'use client'

import { useState } from 'react'

type Item = {
  id: string
  name: string
  category: string
  subcategory: string
  price: number
  bestSeller: boolean
  imageUrl: string | null
  description: string | null
}

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`
const TARGET_CHARS = 52000
const HARD_MAX_CHARS = 58000

function encodeCanvas(canvas: HTMLCanvasElement, quality: number) {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp;base64,')) return webp
  return canvas.toDataURL('image/jpeg', quality)
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not process this image.'))
    image.src = src
  })
}

async function renderAdjustedImage(source: string, zoom: number, positionX: number, positionY: number) {
  const image = await loadImage(source)
  let width = 800
  let height = 450
  let quality = 0.78
  let last = ''

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Image processing is not available on this device.')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom
    const drawWidth = image.naturalWidth * coverScale
    const drawHeight = image.naturalHeight * coverScale
    const overflowX = Math.max(0, drawWidth - width)
    const overflowY = Math.max(0, drawHeight - height)
    const drawX = -overflowX * (positionX / 100)
    const drawY = -overflowY * (positionY / 100)

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
    last = encodeCanvas(canvas, quality)

    if (last.length <= TARGET_CHARS) return last

    if (quality > 0.34) {
      quality = Math.max(0.32, quality - 0.08)
    } else {
      width = Math.max(320, Math.round(width * 0.84))
      height = Math.max(180, Math.round(width * 9 / 16))
      quality = 0.62
    }
  }

  if (last.length <= HARD_MAX_CHARS) return last
  throw new Error('Could not compress this image enough. Try another photo.')
}

async function persistImage(item: Item, imageUrl: string, description: string) {
  const response = await fetch('/api/admin/menu-media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      itemId: item.id,
      name: item.name,
      description,
      imageUrl
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.error || `Could not save ${item.name}. (${response.status})`
    throw new Error(message)
  }
  return data
}

function MediaCard({ item }: { item: Item }) {
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '')
  const [sourceUrl, setSourceUrl] = useState('')
  const [description, setDescription] = useState(item.description || '')
  const [zoom, setZoom] = useState(1)
  const [positionX, setPositionX] = useState(50)
  const [positionY, setPositionY] = useState(50)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function chooseImage(file?: File) {
    if (!file || processing || saving) return
    setProcessing(true)
    setStatus('Loading image…')
    try {
      const source = await readImageFile(file)
      setSourceUrl(source)
      setZoom(1)
      setPositionX(50)
      setPositionY(50)
      setStatus('Adjust the image, then tap Save.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not prepare image.')
    } finally {
      setProcessing(false)
    }
  }

  async function save(nextImage?: string) {
    if (processing || saving) return
    setSaving(true)
    try {
      let valueToSave = nextImage
      if (valueToSave === undefined) {
        if (sourceUrl) {
          setStatus('Applying adjustments…')
          valueToSave = await renderAdjustedImage(sourceUrl, zoom, positionX, positionY)
        } else {
          valueToSave = imageUrl
        }
      }

      setStatus('Saving…')
      const data = await persistImage(item, valueToSave || '', description)
      setImageUrl(data.imageUrl || '')
      setSourceUrl('')
      setStatus('Saved ✓')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save image.')
    } finally {
      setSaving(false)
    }
  }

  async function removeImage() {
    setSourceUrl('')
    setImageUrl('')
    await save('')
  }

  function resetAdjustments() {
    setZoom(1)
    setPositionX(50)
    setPositionY(50)
  }

  const busy = processing || saving
  const previewUrl = sourceUrl || imageUrl

  return <article className="posMediaCard">
    <div className="posMediaPreview">
      {previewUrl ? <img
        src={previewUrl}
        alt={item.name}
        style={sourceUrl ? {
          objectPosition: `${positionX}% ${positionY}%`,
          transform: `scale(${zoom})`,
          transformOrigin: `${positionX}% ${positionY}%`
        } : undefined}
      /> : <span>C</span>}
      {item.bestSeller && <b className="posMediaBadge">BEST SELLER</b>}
    </div>
    <div className="posMediaBody">
      <div>
        <h3>{item.name}</h3>
        <div className="posMediaMeta"><span>{item.category}{item.subcategory ? ` › ${item.subcategory}` : ''}</span><span>•</span><b>{money(item.price)}</b></div>
      </div>
      <label>Upload menu photo
        <input type="file" accept="image/*" disabled={busy} onChange={event => void chooseImage(event.target.files?.[0])}/>
      </label>

      {sourceUrl && <div style={{ display: 'grid', gap: 10, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--cream)' }}>
        <strong style={{ fontSize: 12 }}>Adjust image</strong>
        <label style={{ display: 'grid', gap: 5, fontSize: 11 }}>
          <span>Zoom · {zoom.toFixed(2)}×</span>
          <input type="range" min="1" max="2.5" step="0.05" value={zoom} disabled={busy} onChange={event => setZoom(Number(event.target.value))}/>
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 11 }}>
          <span>← Left / Right →</span>
          <input type="range" min="0" max="100" step="1" value={positionX} disabled={busy} onChange={event => setPositionX(Number(event.target.value))}/>
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 11 }}>
          <span>↑ Up / Down ↓</span>
          <input type="range" min="0" max="100" step="1" value={positionY} disabled={busy} onChange={event => setPositionY(Number(event.target.value))}/>
        </label>
        <button type="button" disabled={busy} onClick={resetAdjustments} style={{ justifySelf: 'start', border: '1px solid var(--line)', borderRadius: 9, background: '#fff', padding: '8px 11px', fontWeight: 700 }}>Reset</button>
      </div>}

      <label>Description
        <textarea value={description} maxLength={1200} disabled={busy} onChange={event => setDescription(event.target.value)} placeholder="Optional description shown on the website"/>
      </label>
      <div className="posMediaActions">
        <button className="posMediaSave" type="button" disabled={busy || !previewUrl} onClick={() => void save()}>{processing ? 'Preparing…' : saving ? 'Saving…' : 'Save'}</button>
        {previewUrl && <button className="posMediaRemove" type="button" disabled={busy} onClick={() => void removeImage()}>Remove image</button>}
      </div>
      <div className="posMediaStatus">{status}</div>
    </div>
  </article>
}

export default function MenuMediaEditor({ items }: { items: Item[] }) {
  return <div className="posMediaGrid">{items.map(item => <MediaCard key={item.id} item={item}/>)}</div>
}
