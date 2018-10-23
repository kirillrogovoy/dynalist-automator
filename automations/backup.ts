import { FileInfo } from '../file'
import path from 'path'
import { writeFileSync } from 'fs'

export function backup (files: FileInfo[]) {
  const backupFile = path.join(__dirname, '../backup', 'files.json')
  writeFileSync(backupFile, JSON.stringify(files))

  return []
}
