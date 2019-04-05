import { NodeChangeInsert } from '../api'
import { NodeTreeSimplified } from '../node-tree'
import { FileInfo } from '../file'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import diff from 'deep-diff'
import { format } from 'date-fns'

export function writeHistory (
  historyFileID: string,
  files: { [key: string]: FileInfo }
) {
  const currentStateFile = '/tmp/currentState.json'

  const filesSerialized: { [key: string]: NodeTreeSimplified } = {}
  for (let key in files) {
    filesSerialized[key] = files[key].nodeTree.simplify()
  }

  if (existsSync(currentStateFile)) {
    const currentState = JSON.parse(readFileSync(currentStateFile).toString())
    const newState = filesSerialized
    const stateDiff = (diff as any)(currentState, newState)
    if (stateDiff) {
      writeFileSync(currentStateFile, JSON.stringify(filesSerialized))
      return [{
        fileID: historyFileID,
        changes: [{
          action: 'insert',
          parent_id: 'root',
          content: format(new Date(), '!(YYYY-MM-DD HH:mm:ss)'),
          note: JSON.stringify(stateDiff, null, 2)
        } as NodeChangeInsert]
      }]
    }
  } else {
    writeFileSync(currentStateFile, JSON.stringify(filesSerialized))
  }

  return []
}
