import { Node } from './api'
import { extractDateString, hasDateInPast, hasDate, diffDays } from './date'

export const HISTORY_NODE_TITLE = 'History'

export type Entity = Project | Todo | Waiting

export interface Project {
  type: 'project'
  node: Node
  objectiveNode: Node
  title: string
  status: 'active' | 'inactive' | 'done'
  labels: string[]
  todo: Todo[]
  waiting: Waiting[]
  deadline?: Date
  informationString: string
  historyNodeId?: string
  history: Node[]
}

export interface Todo {
  type: 'todo'
  priorityScore: number
  node: Node
  projectNode: Node
  title: string
  status: 'ready' | 'planned' | 'done'
  labels: string[]
  informationString: string
  deadline?: Date
}

export interface Waiting {
  type: 'waiting'
  node: Node
  projectNode: Node
  title: string
  status: 'active' | 'planned' | 'done'
  labels: string[]
  informationString: string
  deadline?: Date
}

export function nodesToProjects(nodes: Node[]): Project[] {
  const nodeById = nodesToMap(nodes)

  const findChild = findChildUsing(nodeById)

  const rootNode = nodeById.get('root')!
  const horizons = findChild(rootNode, node =>
    node.content.includes('Horizons')
  )!

  const projects = []

  for (let horizon5id of horizons.children) {
    const horizon5 = nodeById.get(horizon5id)!
    for (let horizon4id of horizon5.children) {
      const horizon4 = nodeById.get(horizon4id)!
      for (let horizon3id of horizon4.children) {
        const horizon3 = nodeById.get(horizon3id)!
        for (let projectId of findChild(
          horizon3,
          node => node.content === 'Projects'
        )!.children) {
          const project = nodesToProject(projectId, horizon3, nodeById)
          projects.push(project)
        }
      }
    }
  }

  return projects
}

export function nodesToMap(nodes: Node[]) {
  const nodeById: Map<string, Node> = new Map()

  for (let node of nodes) {
    nodeById.set(node.id, node)
  }

  return nodeById
}

function nodesToProject(
  projectId: string,
  objectiveNode: Node,
  nodeById: Map<string, Node>
): Project {
  const projectNode = nodeById.get(projectId)!
  const findChild = findChildUsing(nodeById)

  const labels = projectNode.note ? projectNode.note.split(/\s+/g) : []
  const status = projectNode.checked
    ? 'done'
    : labels.includes('focus')
    ? 'active'
    : 'inactive'

  const deadlineNode = findChild(projectNode, node =>
    node.content.startsWith('Deadline')
  )
  let deadline = getDeadline(deadlineNode)

  const todoNode = findChild(projectNode, node => node.content === 'Todo')
  const waitingNode = findChild(projectNode, node => node.content === 'Waiting')
  const historyNode = findChild(projectNode, node =>
    node.content.startsWith(HISTORY_NODE_TITLE)
  )

  const otherNodes = projectNode.children
    .filter(
      nodeId =>
        (!todoNode || todoNode.id !== nodeId) &&
        (!waitingNode || waitingNode.id !== nodeId) &&
        (!deadlineNode || deadlineNode.id !== nodeId) &&
        (!historyNode || historyNode.id !== nodeId)
    )
    .map(id => nodeById.get(id)!)

  const informationString = otherNodes
    .map(node => nodeToStringTree(node, nodeById))
    .join('')

  const todo = todoNode
    ? todoNode.children.map(id =>
        nodesToTodo(id, todoNode, projectNode, nodeById, getPriorityScore(labels, deadline))
      )
    : []
  const waiting = waitingNode
    ? waitingNode.children.map(id => nodesToWaiting(id, projectNode, nodeById))
    : []

  return {
    type: 'project',
    node: projectNode,
    objectiveNode,
    title: projectNode.content,
    status,
    labels,
    todo,
    waiting,
    deadline,
    informationString,
    historyNodeId: historyNode ? historyNode.id : undefined,
    history: historyNode
      ? historyNode.children.map(id => nodeById.get(id)!)
      : []
  }
}

function findChildUsing(nodeById: Map<string, Node>) {
  return (parent: Node, findFn: (node: Node) => boolean) =>
    parent.children.map(id => nodeById.get(id)!).find(findFn)
}

function getDeadline(deadlineNode?: Node) {
  if (!deadlineNode) {
    return undefined
  }

  const dateString = extractDateString(deadlineNode.content)
  if (!dateString) {
    return undefined
  }

  return new Date(dateString)
}

function nodesToTodo(
  nodeId: string,
  todoListNode: Node,
  projectNode: Node,
  nodeById: Map<string, Node>,
  projectPriorityScore: number,
): Todo {
  const findChild = findChildUsing(nodeById)

  const todoNode = nodeById.get(nodeId)!

  const labels = todoNode.note ? todoNode.note.split(/\s+/g) : []

  const deadlineNode = findChild(todoNode, node =>
    node.content.startsWith('Deadline')
  )
  let deadline = getDeadline(deadlineNode)

  const otherNodes = todoNode.children
    .filter(nodeId => !deadlineNode || deadlineNode.id !== nodeId)
    .map(id => nodeById.get(id)!)

  const informationString = otherNodes
    .map(node => nodeToStringTree(node, nodeById))
    .join('')

  const allTodoNodes = todoListNode.children
    .map(id => nodeById.get(id)!)
    .filter(node => !node.checked)
  const isReady =
    hasDateInPast(todoNode.content) ||
    (!hasDate(todoNode.content) &&
      allTodoNodes[0] &&
      todoNode.id === allTodoNodes[0].id)

  const status = todoNode.checked ? 'done' : isReady ? 'ready' : 'planned'

  const priorityScore = projectPriorityScore + getPriorityScore(labels, deadline)

  return {
    type: 'todo',
    priorityScore,
    node: todoNode,
    projectNode,
    title: todoNode.content,
    status,
    labels,
    deadline,
    informationString
  }
}

function nodesToWaiting(
  nodeId: string,
  projectNode: Node,
  nodeById: Map<string, Node>
): Waiting {
  const findChild = findChildUsing(nodeById)

  const waitingNode = nodeById.get(nodeId)!

  const labels = waitingNode.note ? waitingNode.note.split(/\s+/g) : []

  const deadlineNode = findChild(waitingNode, node =>
    node.content.startsWith('Deadline')
  )
  let deadline = getDeadline(deadlineNode)

  const otherNodes = waitingNode.children
    .filter(nodeId => !deadlineNode || deadlineNode.id !== nodeId)
    .map(id => nodeById.get(id)!)

  const informationString = otherNodes
    .map(node => nodeToStringTree(node, nodeById))
    .join('')

  const isActive =
    !hasDate(waitingNode.content) || hasDateInPast(waitingNode.content)
  const status = waitingNode.checked ? 'done' : isActive ? 'active' : 'planned'

  return {
    type: 'waiting',
    node: waitingNode,
    projectNode,
    title: waitingNode.content,
    status,
    labels,
    deadline,
    informationString
  }
}

function nodeToStringTree(node: Node, nodeById: Map<string, Node>) {
  let tree = ''
  const addNodeToTree = (node: Node, indent: number) => {
    tree += new Array(indent).join(' ')
    tree += node.content + '\n'
    node.children
      .map(id => nodeById.get(id)!)
      .forEach(childNode => {
        addNodeToTree(childNode, indent + 4)
      })
  }

  addNodeToTree(node, 0)

  return tree
}

export function projectsToFlatEntities(projects: Project[]) {
  const entitiesByNodeId: { [key: string]: Entity } = {}

  for (let project of projects) {
    entitiesByNodeId[project.node.id] = project

    for (let todo of project.todo) {
      entitiesByNodeId[todo.node.id] = todo
    }

    for (let waiting of project.waiting) {
      entitiesByNodeId[waiting.node.id] = waiting
    }
  }

  return entitiesByNodeId
}

function getPriorityScore(labels: string[], deadline: Date | undefined) {
  const doNowScore = (labels.includes('do-now') ? 100 : 0)
  const blockerScore = (labels.includes('blocker') ? 10 : 0)
  const deadlineScore = (deadline ? Math.max(10 - (diffDays(new Date(), deadline!)), 0) : 0)
  return doNowScore + blockerScore + deadlineScore
}
