import { format } from 'date-fns'

const dateRegexp = /\!\((\d{4}-\d{2}-\d{2})\)/

export function hasDate(input: string) {
  return dateRegexp.test(input)
}

export function hasDateInPast(input: string) {
  const result = dateRegexp.exec(input)

  if (!result || !result[1]) {
    return false
  }

  const dateString = result[1]
  const date = new Date(dateString)
  const now = new Date()

  return now > date
}

export function extractDateString(input: string) {
  const result = dateRegexp.exec(input)

  if (!result || !result[1]) {
    return null
  }

  return result[1]
}

export function dateToDynalistFormat(date: Date) {
  return `!(${format(date, 'YYYY-MM-DD HH:mm:ss')})`
}
