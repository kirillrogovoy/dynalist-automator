import { NodeTree } from './node-tree'
import { FileInfo } from './file'

export function getGTDProjects (fileInfo: FileInfo, scope: 'focus' | 'all' = 'focus') {
  const gtdProjects: NodeTree[] = []

  for (let horizon5Node of fileInfo.nodeTree.child('Horizons')!.children) {
    for (let horizon4Node of horizon5Node.children) {
      for (let horizon3Node of horizon4Node.children) {
        const horizon3Projects = horizon3Node.child('Projects')
        if (horizon3Projects) {
          gtdProjects.push(...horizon3Projects.children.filter(p => isActive(p) && (scope === 'all' || isFocus(p))))
        }
      }
    }
  }

  return gtdProjects
}

function isActive (project: NodeTree) {
  return !project.checked
}

function isFocus (project: NodeTree) {
  return project.note.match(/focus/i)
}
