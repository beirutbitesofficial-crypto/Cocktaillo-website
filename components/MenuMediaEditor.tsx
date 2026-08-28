'use client'

import { useEffect, useRef, useState } from 'react'

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

type DragState = {
  pointerId: number
  startX: number
  startY: number
  panX: number
  panY: number
}

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`
const TARGET_CHARS = 52000
const HARD_MAX_CHARS = 58000
const CROP_WIDTH = 960
const CROP_HEIGHT = 540

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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

function cropGeometry(width: number, height: number, image: HTMLImageElement, zoom: number) {
  const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom
  const drawWidth = image.naturalWidth * coverScale
  const drawHeight = image.naturalHeight * coverScale
  return {
    drawWidth,
    drawHeight,
    halfOverflowX: Math.max(0, (drawWidth - width) / 2),
    halfOverflowY: Math.max(0, (drawHeight - height) / 2)
  }
}

function drawCrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  zoom: number,
  panX: number,
  panY: number
) {
  const geometry = cropGeometry(width, height, image, zoom)
  const drawX = (width - geometry.drawWidth) / 2 + panX * geometry.halfOverflowX
  const drawY = (height - geometry.drawHeight) / 2 + panY * geometry.halfOverflowY

  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, drawX, drawY, geometry.drawWidth, geometry.drawHeight)
}

async function renderAdjustedImage(source: string, zoom: number, panX: number, panY: number) {
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

    drawCrop(ctx, width, height, image, zoom, panX, panY)
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
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropApplied, setCropApplied] = useState(false)
  const [cropReadyVersion, setCropReadyVersion] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropImageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)

  useEffect(() => {
    if (!sourceUrl) {
      cropImageRef.current = null
      return
    }

    let cancelled = false
    void loadImage(sourceUrl).then(image => {
      if (cancelled) return
      cropImageRef.current = image
      setCropReadyVersion(version => version + 1)
    }).catch(() => {
      if (!cancelled) setStatus('Could not process this image.')
    })

    return () => { cancelled = true }
  }, [sourceUrl])

  useEffect(() => {
    if (!cropOpen) return
    const canvas = canvasRef.current
    const image = cropImageRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawCrop(ctx, canvas.width, canvas.height, image, zoom, panX, panY)
  }, [cropOpen, cropReadyVersion, zoom, panX, panY])

  useEffect(() => {
    if (!cropOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [cropOpen])

  async function chooseImage(file?: File) {
    if (!file || processing || saving) return
    setProcessing(true)
    setStatus('Loading image…')
    try {
      const source = await readImageFile(file)
      setSourceUrl(source)
      setZoom(1)
      setPanX(0)
      setPanY(0)
      setCropApplied(false)
      setCropOpen(true)
      setStatus('Adjust the photo, then tap Use photo.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not prepare image.')
    } finally {
      setProcessing(false)
    }
  }

  async function applyCrop() {
    if (!sourceUrl || processing || saving) return
    setProcessing(true)
    setStatus('Preparing adjusted image…')
    try {
      const adjusted = await renderAdjustedImage(sourceUrl, zoom, panX, panY)
      setImageUrl(adjusted)
      setCropApplied(true)
      setCropOpen(false)
      setStatus('Image ready — tap Save.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not prepare image.')
    } finally {
      setProcessing(false)
    }
  }

  function cancelCrop() {
    setCropOpen(false)
    if (!cropApplied) setSourceUrl('')
    setStatus(cropApplied ? 'Keeping previous adjustment.' : 'Photo adjustment cancelled.')
  }

  function resetCrop() {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  function cropHalfOverflow() {
    const canvas = canvasRef.current
    const image = cropImageRef.current
    if (!canvas || !image) return { x: 0, y: 0 }
    const geometry = cropGeometry(canvas.width, canvas.height, image, zoom)
    return { x: geometry.halfOverflowX, y: geometry.halfOverflowY }
  }

  function beginPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    canvas.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const pointers = Array.from(pointersRef.current.values())
    if (pointers.length >= 2) {
      const [first, second] = pointers
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom
      }
      dragRef.current = null
      return
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX,
      panY
    }
  }

  function movePointer(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) return
    event.preventDefault()
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const pointers = Array.from(pointersRef.current.values())
    if (pointers.length >= 2 && pinchRef.current) {
      const [first, second] = pointers
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      if (pinchRef.current.distance > 0) {
        setZoom(clamp(pinchRef.current.zoom * (distance / pinchRef.current.distance), 1, 3))
      }
      return
    }

    const drag = dragRef.current
    const canvas = canvasRef.current
    if (!drag || drag.pointerId !== event.pointerId || !canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const overflow = cropHalfOverflow()
    const dx = (event.clientX - drag.startX) * (canvas.width / rect.width)
    const dy = (event.clientY - drag.startY) * (canvas.height / rect.height)

    setPanX(overflow.x > 0.5 ? clamp(drag.panX + dx / overflow.x, -1, 1) : 0)
    setPanY(overflow.y > 0.5 ? clamp(drag.panY + dy / overflow.y, -1, 1) : 0)
  }

  function endPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId)
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {}

    const remaining = Array.from(pointersRef.current.entries())
    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0]
      dragRef.current = { pointerId, startX: point.x, startY: point.y, panX, panY }
    } else {
      dragRef.current = null
    }
    pinchRef.current = null
  }

  async function save(nextImage?: string) {
    if (processing || saving) return
    setSaving(true)
    setStatus('Saving…')
    try {
      const valueToSave = nextImage === undefined ? imageUrl : nextImage
      const data = await persistImage(item, valueToSave || '', description)
      setImageUrl(data.imageUrl || '')
      setSourceUrl('')
      setCropApplied(false)
      setStatus('Saved ✓')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save image.')
    } finally {
      setSaving(false)
    }
  }

  async function removeImage() {
    setCropOpen(false)
    setSourceUrl('')
    setImageUrl('')
    setCropApplied(false)
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

      {sourceUrl && cropApplied && !cropOpen && <button className="posMediaAdjust" type="button" disabled={busy} onClick={() => setCropOpen(true)}>Adjust photo</button>}

      <label>Description
        <textarea value={description} maxLength={1200} disabled={busy} onChange={event => setDescription(event.target.value)} placeholder="Optional description shown on the website"/>
      </label>
      <div className="posMediaActions">
        <button className="posMediaSave" type="button" disabled={busy || !imageUrl} onClick={() => void save()}>{processing ? 'Preparing…' : saving ? 'Saving…' : 'Save'}</button>
        {imageUrl && <button className="posMediaRemove" type="button" disabled={busy} onClick={() => void removeImage()}>Remove image</button>}
      </div>
      <div className="posMediaStatus">{status}</div>
    </div>

    {cropOpen && sourceUrl && <div className="imageCropOverlay" role="dialog" aria-modal="true" aria-label={`Adjust ${item.name}`}>
      <div className="imageCropDialog">
        <div className="imageCropHeader">
          <button type="button" onClick={cancelCrop} disabled={processing}>Cancel</button>
          <strong>Adjust photo</strong>
          <button className="imageCropUse" type="button" onClick={() => void applyCrop()} disabled={processing}>{processing ? 'Working…' : 'Use photo'}</button>
        </div>

        <div className="imageCropStage">
          <canvas
            ref={canvasRef}
            className="imageCropCanvas"
            width={CROP_WIDTH}
            height={CROP_HEIGHT}
            onPointerDown={beginPointer}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          />
          <div className="imageCropGrid" aria-hidden="true"/>
        </div>

        <div className="imageCropControls">
          <div className="imageCropHint">Drag to reposition · pinch or use the slider to zoom</div>
          <div className="imageCropZoom">
            <span>−</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} disabled={processing} onChange={event => setZoom(Number(event.target.value))}/>
            <span>+</span>
          </div>
          <button className="imageCropReset" type="button" onClick={resetCrop} disabled={processing}>Reset</button>
        </div>
      </div>
    </div>}
  </article>
}

export default function MenuMediaEditor({ items }: { items: Item[] }) {
  return <div className="posMediaGrid">{items.map(item => <MediaCard key={item.id} item={item}/>)}</div>
}
