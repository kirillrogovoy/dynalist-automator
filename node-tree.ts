import { NodeID, Node } from './api'
import { getURLFromID } from './node-url'

export interface NodeTree {
  id: NodeID
  url: string
  parent?: NodeTree
  content: string
  note: string
  checked: boolean
  children: NodeTree[]
  child (title: string): NodeTree | undefined
}

export function buildTree (fileID: string, nodes: Node[]): NodeTree {
  const nodeById: { [key: string]: Node } = {}

  for (let node of nodes) {
    nodeById[node.id] = node
  }

  const rootNode = nodeById.root

  return nodeToNodeTree(fileID, nodeById, rootNode)
}

function nodeToNodeTree (
  fileID: string,
  nodeById: { [key: string]: Node },
  node: Node
): NodeTree {
  const childrenIDs = node.children || []

  const nodeTree = {
    ...node,
    url: getURLFromID(fileID, node.id),
    children: childrenIDs.map(id => nodeToNodeTree(fileID, nodeById, nodeById[id])),
    child (title: string) {
      return this.children.find(c => c.content.trim().endsWith(title))
    }
  }

  for (let child of nodeTree.children) {
    child.parent = nodeTree
  }

  return nodeTree
}
