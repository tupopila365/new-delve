type Listener = () => void

let listener: Listener | null = null

export function subscribeDelversSearch(fn: Listener) {
  listener = fn
  return () => {
    if (listener === fn) listener = null
  }
}

export function openDelversSearch() {
  listener?.()
}
