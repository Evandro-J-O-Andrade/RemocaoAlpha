export function formatDistanceToTime(startAt: string | Date, until?: string | Date): string {
  const start = new Date(startAt).getTime()
  const end = (until ? new Date(until) : new Date()).getTime()
  const diffInSeconds = Math.floor((end - start) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  const diffInHours = Math.floor(diffInMinutes / 60)
  return `${diffInHours}h ${diffInMinutes % 60}m`
}

export function formatDistanceFromNow(to: string | Date): string {
  return formatDistanceToTime(to, new Date())
}

export function elapsedTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

export function formatDateTimePt(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString('pt-BR')
}

export function formatDatePt(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function formatTimePt(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR')
}
