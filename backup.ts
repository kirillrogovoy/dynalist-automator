import api from './api'
import fs from 'fs'
import path from 'path'
import { fileIDByTitle } from './file'

async function main () {
  const files = {
    gtd: await api.file.content(fileIDByTitle.gtd),
    projects: await api.file.content(fileIDByTitle.projects),
    todo: await api.file.content(fileIDByTitle.todo),
    waiting: await api.file.content(fileIDByTitle.waiting),
    recurring: await api.file.content(fileIDByTitle.recurring)
  }

  const backupDir = path.join(__dirname, '..', 'backup')
  try {
    fs.mkdirSync(backupDir)
  } catch (e) { console.log() }
  fs.writeFileSync(path.join(backupDir, Date.now().toString() + '.json'), JSON.stringify(files))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
