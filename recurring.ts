import { API, Node, NodeChangeEdit } from './api'
import * as later from 'later'
import { PollSubscription } from './polling'
import { filter, map } from 'rxjs/operators'
import { nodesToMap } from './project'
import { emojify, unemojify } from 'node-emoji'

export interface FileNode {
  fileId: string
  nodeId: string
}

export interface RecurringTask {
  node: Node
  laterSched?: later.Timer
}

export function startPostingRecurring(
  api: API,
  pollSubscription: PollSubscription,
  source: FileNode,
  target: FileNode
) {
  const currentTasks: RecurringTask[] = []

  const expectedTasks$ = pollSubscription.freshFileContent$.pipe(
    filter(({ fileId }) => fileId === source.fileId),
    map(({ nodes }) => nodesToMap(nodes)),
    map(nodeById =>
      nodeById
        .get(source.nodeId)!
        .children.map(id => nodeById.get(id)!)
        .map(node => node.children)
        .flat()
        .map(id => nodeById.get(id)!)
    ),
    map(nodes => nodes.map((node): RecurringTask => ({ node })))
  )

  expectedTasks$.subscribe(expectedTasks => {
    const toCreate = expectedTasks.filter(
      taskExpected =>
        !currentTasks.find(
          taskActive => taskExpected.node.id === taskActive.node.id
        )
    )

    const toDelete = currentTasks.filter(
      taskActive =>
        !expectedTasks.find(
          taskExpected => taskExpected.node.id === taskActive.node.id
        )
    )

    const toPutWarning: RecurringTask[] = []

    for (let task of toCreate) {
      const laterRegex = /^\[(.+)\]/
      const intervalTextResult = laterRegex.exec(task.node.content)
      if (!intervalTextResult || !intervalTextResult[1]) {
        toPutWarning.push(task)
        continue
      }

      let intervalText = intervalTextResult[1]
      if (!intervalText.includes(' at ')) {
        intervalText += ' at 04:00'
      }

      const sched = later.parse.text(intervalText)
      if (sched.error !== -1) {
        toPutWarning.push(task)
        continue
      }

      const timer = later.setInterval(async () => {
        console.log('adding recurring', task.node.content)
        api.file.change(target.fileId, [
          {
            action: 'insert',
            parent_id: target.nodeId,
            content: emojify(`:recycle: ${task.node.content}`),
            index: 0,
            note: task.node.note
          }
        ])
      }, sched)
      currentTasks.push({
        node: task.node,
        laterSched: timer
      })
    }

    for (let task of toDelete) {
      task.laterSched!.clear()
      delete currentTasks[currentTasks.indexOf(task)]
    }

    const putWarningChanges: NodeChangeEdit[] = []
    for (let task of toPutWarning) {
      if (unemojify(task.node.content).includes(':warning:')) {
        continue
      }

      putWarningChanges.push({
        action: 'edit',
        node_id: task.node.id,
        content: emojify(`:warning: ${task.node.content}`)
      })
    }

    api.file.change(source.fileId, putWarningChanges)
  })
}
