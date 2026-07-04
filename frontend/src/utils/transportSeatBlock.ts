/** Seat block helpers for shared bus booking UI. */

export function seatBlockForStart(firstSeat: number, passengers: number): number[] {
  const out: number[] = []
  for (let i = 0; i < passengers; i += 1) {
    out.push(firstSeat + i)
  }
  return out
}

export function canStartSeatAt(
  seat: number,
  totalSeats: number,
  passengers: number,
  taken: Set<number>,
): boolean {
  if (seat < 1 || seat > totalSeats || taken.has(seat)) return false
  for (let i = 0; i < passengers; i += 1) {
    const n = seat + i
    if (n > totalSeats || taken.has(n)) return false
  }
  return true
}

export function isSeatBlockValid(
  blockSeats: number[],
  totalSeats: number,
  passengers: number,
  taken: Set<number>,
): boolean {
  if (blockSeats.length !== passengers) return false
  for (const n of blockSeats) {
    if (n < 1 || n > totalSeats || taken.has(n)) return false
  }
  for (let i = 0; i < blockSeats.length - 1; i += 1) {
    if (blockSeats[i + 1] !== blockSeats[i] + 1) return false
  }
  return true
}
