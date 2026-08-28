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
const TARGET_CHARS = 58000

const filenameKey = (value: string) => value
  .replace(/\.[^.]+$/, '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[’']/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

    let maxDimension = 900
    let quality = 0.84
    let last = ''

    for (let attempt = 0; attempt < 12; attempt++) {
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
      last = canvas.toDataURL('image/jpeg', quality)
      if (last.length <= TARGET_CHARS) return last

      if (quality > 0.48) quality -= 0.08
      else {
        maxDimension = Math.max(420, Math.round(maxDimension * 0.82))
        quality = 0.68
      }
    }

    if (last.length <= 60000) return last
    throw new Error('This photo is too large. Choose a smaller image.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function persistImage(item: Item, imageUrl: string) {
  const response = await fetch('/api/admin/menu-media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      itemId: item.id,
      name: item.name,
      description: item.description || '',
      imageUrl
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Could not save ${item.name}.`)
  return data
}

function MediaCard({ item }: { item: Item }) {
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '')
  const [description, setDescription] = useState(item.description || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function chooseImage(file?: File) {
    if (!file) return
    setStatus('Preparing image…')
    try {
      const compressed = await compressMenuImage(file)
      setImageUrl(compressed)
      setStatus('Image ready — press Save.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not prepare image.')
    }
  }

  async function save(nextImage = imageUrl) {
    setSaving(true)
    setStatus('Saving…')
    try {
      const response = await fetch('/api/admin/menu-media', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, name: item.name, description, imageUrl: nextImage })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not save image.')
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
        <input type="file" accept="image/*" onChange={event => void chooseImage(event.target.files?.[0])}/>
      </label>
      <label>Description
        <textarea value={description} maxLength={1200} onChange={event => setDescription(event.target.value)} placeholder="Optional description shown on the website"/>
      </label>
      <div className="posMediaActions">
        <button className="posMediaSave" type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
        {imageUrl && <button className="posMediaRemove" type="button" disabled={saving} onClick={() => void removeImage()}>Remove image</button>}
      </div>
      <div className="posMediaStatus">{status}</div>
    </div>
  </article>
}

function BulkMenuImageUpload({ items }: { items: Item[] }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList || [])
    if (!files.length || busy) return

    const itemsByName = new Map<string, Item[]>()
    for (const item of items) {
      const key = filenameKey(item.name)
      const matches = itemsByName.get(key) || []
      matches.push(item)
      itemsByName.set(key, matches)
    }

    setBusy(true)
    let saved = 0
    const unmatched: string[] = []
    const failed: string[] = []

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const matches = itemsByName.get(filenameKey(file.name)) || []

        if (matches.length !== 1) {
          unmatched.push(file.name)
          continue
        }

        const item = matches[0]
        setStatus(`Processing ${index + 1}/${files.length}: ${item.name}`)

        try {
          const compressed = await compressMenuImage(file)
          await persistImage(item, compressed)
          saved += 1
        } catch {
          failed.push(file.name)
        }
      }

      const parts = [`${saved} image${saved === 1 ? '' : 's'} saved ✓`]
      if (unmatched.length) parts.push(`No name match: ${unmatched.join(', ')}`)
      if (failed.length) parts.push(`Failed: ${failed.join(', ')}`)
      setStatus(parts.join(' · '))

      if (saved > 0 && unmatched.length === 0 && failed.length === 0) {
        window.setTimeout(() => window.location.reload(), 700)
      }
    } finally {
      setBusy(false)
    }
  }

  return <div className="posMediaIntro">
    <strong>Bulk upload by filename:</strong> choose multiple photos at once. A file named <code>crepe-chocolate.png</code> matches <strong>Crepe - Chocolate</strong>, <code>crepe-nutella.png</code> matches <strong>Crepe - Nutella</strong>, and so on. Matching photos are compressed and saved automatically.
    <div style={{ marginTop: 12 }}>
      <input type="file" accept="image/*" multiple disabled={busy} onChange={event => void uploadFiles(event.target.files)}/>
    </div>
    <div className="posMediaStatus" style={{ marginTop: 8 }}>{busy ? 'Uploading… ' : ''}{status}</div>
  </div>
}

export default function MenuMediaEditor({ items }: { items: Item[] }) {
  return <>
    <BulkMenuImageUpload items={items}/>
    <div className="posMediaGrid">{items.map(item => <MediaCard key={item.id} item={item}/>)}</div>
  </>
}
