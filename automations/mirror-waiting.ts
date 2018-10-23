import api, { NodeChange } from '../api'
import { NodeTree } from '../node-tree'
import { FileInfo } from '../file'
import { getGTDProjects } from '../projects'
import { getIDFromURL } from '../node-url'

export function mirrorWaiting (gtd: FileInfo, waiting: FileInfo) {
  const gtdProjects = getGTDProjects(gtd)
  const boardWaitingTasks = waiting.nodeTree.child('Current')!.children

  const nextWaitingTasks: {content: string, note: string}[] = []
  for (let gtdProject of gtdProjects) {
    const waitingTasksList = gtdProject.child('Waiting')
    if (!waitingTasksList) {
      continue
    }
    const waitingTasks = waitingTasksList.children
      .filter(node => !node.checked)
      .map(node => ({
        content: node.content.trim(),
        note: `Project: ${node.parent!.parent!.url}`
      }))
    nextWaitingTasks.push(...waitingTasks)
  }

  const toCreate = nextWaitingTasks.filter(task => {
    return !boardWaitingTasks.find(
      boardTask =>
        JSON.stringify([task.content, task.note])
        === JSON.stringify([boardTask.content, boardTask.note])
    )
  })

  const toRemove = boardWaitingTasks.filter(boardTask => {
    return !nextWaitingTasks.find(
      task =>
        JSON.stringify([task.content, task.note])
        === JSON.stringify([boardTask.content, boardTask.note])
    )
  })

  const insertChanges = toCreate.map(task => ({
    action: 'insert',
    index: 0,
    parent_id: waiting.nodeTree.child('Current')!.id,
    content: task.content,
    note: task.note
  }))

  const deleteChanges = toRemove.map(p => ({
    action: 'delete',
    node_id: p.id
  }))

  return [{
    fileID: waiting.fileID,
    changes: [...deleteChanges, ...insertChanges] as NodeChange[]
  }]
  return []
}
