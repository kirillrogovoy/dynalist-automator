import api, { NodeChangeEdit, NodeChangeInsert } from '../api'
import { FileInfo } from '../file'
import { RecurringTask } from '../recurring-task'
import later from 'later'

export function processRecurring (
  recurringTasksActive: RecurringTask[],
  recurring: FileInfo,
  todo: FileInfo
) {
  const recurringTasksExpected = recurring.nodeTree.children.map(t => t.children)
    .reduce((acc, cur) => [...acc, ...cur], [])
    .map(node => new RecurringTask(node))

  const toCreate = recurringTasksExpected.filter(taskExpected =>
    !recurringTasksActive.find(taskActive => taskExpected.node.id === taskActive.node.id)
  )

  const toDelete = recurringTasksActive.filter(taskActive =>
    !recurringTasksExpected.find(taskExpected => taskExpected.node.id === taskActive.node.id)
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

    const taskTarget = todo.nodeTree.child('Recurring')!
    const timer = later.setInterval(async () => {
      api.file.change(todo.fileID, [{
        action: 'insert',
        parent_id: taskTarget.id,
        content: `♻️ ${task.node.content}`,
        index: 0,
        note: task.node.note
      }])
    }, sched)
    recurringTasksActive.push(new RecurringTask(task.node, timer))
  }

  for (let task of toDelete) {
    task.laterSched!.clear()
    delete recurringTasksActive[recurringTasksActive.indexOf(task)]
  }

  const putWarningChanges: NodeChangeEdit[] = []
  for (let task of toPutWarning) {
    if (task.node.content.includes('⚠️')) {
      continue
    }

    putWarningChanges.push({
      action: 'edit',
      node_id: task.node.id,
      content: '⚠️ ' + task.node.content
    })
  }

  return [{
    fileID: recurring.fileID,
    changes: putWarningChanges
  }]
}
