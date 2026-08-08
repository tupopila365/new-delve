export type Theme = 'light' | 'dark'

export const light = {
  canvas: '#F4F1EA',
  surface: '#FFFFFF',
  subtle: '#FAF8F4',
  primary: '#5F2FC9',
  brand: '#8C52FF',
  text: '#1A1814',
  muted: '#6F695F',
  border: '#DDD6CA',
  success: '#16845B',
  warning: '#B76808',
  error: '#C83B3B',
  info: '#2769C7',
  nav: '#FFFFFF',
  elevated: '#FFFFFF',
  msgSent: '#8C52FF',
  msgSentText: '#FFFFFF',
  msgReceived: '#FFFFFF',
  msgReceivedText: '#1A1814',
}

export const dark = {
  canvas: '#0C0A09',
  surface: '#1B1816',
  subtle: '#12100F',
  primary: '#8C52FF',
  brand: '#8C52FF',
  text: '#FFFAF2',
  muted: '#B8ADA3',
  border: '#39322E',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#60A5FA',
  nav: '#12100F',
  elevated: '#24201E',
  msgSent: '#8C52FF',
  msgSentText: '#FFFAF2',
  msgReceived: '#24201E',
  msgReceivedText: '#FFFAF2',
}

export type Tok = typeof light
