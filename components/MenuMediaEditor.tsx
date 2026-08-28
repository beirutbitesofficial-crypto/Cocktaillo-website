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

async function compressMenuImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read this image.'))
      img.src = objectUrl
    })

    let maxDimension = 760
    let quality = 0.76
    let last = ''

    for (let attempt = 0; attempt < 30; attempt += 1) {
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

      if (quality > 0.34) {
        quality = Math.max(0.32, quality - 0.08)
      } else {
        maxDimension = Math.max(260, Math.round(maxDimension * 0.82))
        quality = 0.62
      }
    }

    if (last.length <= HARD_MAX_CHARS) return last
    throw new Error('Could not compress this image enough. Try another photo.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
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
  const [description, setDescription] = useState(item.description || '')
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function chooseImage(file?: File) {
    if (!file || processing || saving) return
    setProcessing(true)
    setStatus('Preparing image…')
    try {
      const compressed = await compressMenuImage(file)
      setImageUrl(compressed)
      setStatus('Image ready — tap Save.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not prepare image.')
    } finally {
      setProcessing(false)
    }
  }

  async function save(nextImage?: string) {
    if (processing || saving) return
    setSaving(true)
    setStatus('Saving…')
    try {
      const valueToSave = nextImage === undefined ? imageUrl : nextImage
      const data = await persistImage(item, valueToSave, description)
      setImageUrl(data.imageUrl || '')
      setStatus('Saved ✓')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save image.')
    } finally {
      setSaving(false)
    }
  }

  async function removeImage() {
    setImageUrl('')
    await save('')
  }

  const busy = processing || saving

  return <article className="posMediaCard">
    <div className="posMediaPreview">
      {imageUrl ? <img src={imageUrl} alt={item.name}/> : <span>C</span>}
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
      <label>Description
        <textarea value={description} maxLength={1200} disabled={busy} onChange={event => setDescription(event.target.value)} placeholder="Optional description shown on the website"/>
      </label>
      <div className="posMediaActions">
        <button className="posMediaSave" type="button" disabled={busy || !imageUrl} onClick={() => void save()}>{processing ? 'Preparing…' : saving ? 'Saving…' : 'Save'}</button>
        {imageUrl && <button className="posMediaRemove" type="button" disabled={busy} onClick={() => void removeImage()}>Remove image</button>}
      </div>
      <div className="posMediaStatus">{status}</div>
    </div>
  </article>
}

export default function MenuMediaEditor({ items }: { items: Item[] }) {
  return <div className="posMediaGrid">{items.map(item => <MediaCard key={item.id} item={item}/>)}</div>
}
