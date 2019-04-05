import { NodeChange } from '../api'
import { NodeTree } from '../node-tree'
import { FileInfo } from '../file'
import { getGTDProjects } from '../projects'
import { getIDFromURL } from '../node-url'
import { hasDateInPast, hasDate } from '../date'
import { Task } from '../task'

export function mirrorTodo (gtd: FileInfo, todo: FileInfo) {
  const gtdProjects = getGTDProjects(gtd)
  const personalTodoTasks = todo.nodeTree.child('Personal')!
  const skyengTodoTasks = todo.nodeTree.child('Skyeng')!

  const boardTodoTasksActual: Task[] = [
    ...personalTodoTasks.children,
    ...skyengTodoTasks.children
  ].map(node => {
    const project = gtdProjects.find(p => p.id === getIDFromURL(node.note)) || 'none'
    let gtdNode: NodeTree | 'none' = 'none'
    if (project !== 'none') {
      const tasks = project.child('Todo')
      if (tasks) {
        gtdNode = tasks.children.find(t => t.id === getIDFromURL(node.content)) || 'none'
      }
    }

    const group = node.parent!.content.includes('Skyeng') ? 'skyeng' : 'personal'
    return new Task(node, gtdNode, project, group)
  })

  const boardTodoTasksExpected: Task[] = []

  for (let gtdProject of gtdProjects) {
    const todoNode = gtdProject.child('Todo')
    const tasks = todoNode ? todoNode.children.filter(n => !n.checked) : []
    const tasksExist = tasks.length > 0

    const waitingNode = gtdProject.child('Waiting')
    const waitingTasks = waitingNode ? waitingNode.children.filter(n => !n.checked) : []
    const waitingTasksExist = waitingTasks.length > 0

    const group = gtdProject.parent!.parent!.content.includes('Skyeng') ? 'skyeng' : 'personal'

    if (!tasksExist && !waitingTasksExist) {
      boardTodoTasksExpected.push(new Task('none', 'none', gtdProject, group))
      continue
    }

    for (let [id, task] of tasks.entries()) {
      if ((id === 0 && !hasDate(task.content)) || hasDateInPast(task.content)) {
        boardTodoTasksExpected.push(new Task('none', task, gtdProject, group))
      }
    }
  }

  const toCreate = boardTodoTasksExpected.filter(task => {
    return !boardTodoTasksActual.find(
        t => t.taskSignature() === task.taskSignature()
      )
  })

  const insertChanges = toCreate.map(task => {
    const parentNode = task.group === 'skyeng'
      ? skyengTodoTasks
      : personalTodoTasks

    return {
      action: 'insert',
      // index: task.getContent().includes('#focus') ? 0 : -1,
      index: 0,
      parent_id: parentNode.id,
      content: task.getContent(),
      note: task.getNote()
    }
  })

  const toDelete = boardTodoTasksActual.filter(task => {
    return !boardTodoTasksExpected.find(
        t => t.taskSignature() === task.taskSignature()
      )
  })

  const deleteChanges = toDelete.map(p => ({
    action: 'delete',
    node_id: p.boardNode !== 'none' ? p.boardNode.id : ''
  }))

  return [{
    fileID: todo.fileID,
    changes: [...insertChanges, ...deleteChanges] as NodeChange[]
  }]
}
