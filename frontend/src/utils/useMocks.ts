/** True when the app uses in-browser mock API instead of Django. */
export function mocksEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCKS === 'true'
}
