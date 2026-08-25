export type MenuMedia = {
  name?: string
  description?: string | null
  imageUrl?: string | null
}

export const menuMediaKey = (itemId: string) => `menuMedia:${itemId}`

export function parseMenuMedia(value?: string): MenuMedia | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      description: typeof parsed.description === 'string' ? parsed.description : null,
      imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null
    }
  } catch {
    return null
  }
}
