export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  
  const dayName = dayNames[date.getDay()]
  const monthName = monthNames[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  
  // Add ordinal suffix
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }
  
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  return `${dayName}, ${monthName} ${getOrdinal(day)} ${year}, ${time}`
}