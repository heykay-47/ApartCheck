const ticketDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function formatTicketDate(value: string) {
  return ticketDateFormatter.format(new Date(value))
}
