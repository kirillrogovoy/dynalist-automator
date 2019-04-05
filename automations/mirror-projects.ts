import { NodeChange } from '../api'
import { FileInfo } from '../file'
import { getGTDProjects } from '../projects'

export function mirrorProjects (gtd: FileInfo, projects: FileInfo) {
  const gtdProjects = getGTDProjects(gtd)

  const personalProjects = projects.nodeTree.child('Personal')!
  const skyengProjects = projects.nodeTree.child('Skyeng')!

  const boardProjects = [
    ...personalProjects.children,
    ...skyengProjects.children
  ]

  const gtdProjectInfos = gtdProjects.map(gtdProject => {
    const objective = gtdProject.parent!.parent!
    const isSkyeng = objective.content.includes('Skyeng')

    const parentNode = isSkyeng
      ? skyengProjects
      : personalProjects

    const objectiveNote = isSkyeng
      ? ''
      : `Objective: ${objective.url}`

    return {
      gtdProject,
      parentNode,
      content: `${gtdProject.content} [ ](${gtdProject.url})`.trim(),
      note: (objectiveNote + ' ' + gtdProject.note).trim()
    }
  })

  const toCreate = gtdProjectInfos.filter(gtdProjectInfo => !boardProjects.find(
    boardProject => {
      return JSON.stringify([gtdProjectInfo.content, gtdProjectInfo.note, gtdProjectInfo.parentNode.id])
      === JSON.stringify([boardProject.content, boardProject.note, boardProject.parent!.id])
    }
  ))

  const toDelete = boardProjects.filter(boardProject => !gtdProjectInfos.find(
    gtdProjectInfo =>
      JSON.stringify([gtdProjectInfo.content, gtdProjectInfo.note, gtdProjectInfo.parentNode.id])
      === JSON.stringify([boardProject.content, boardProject.note, boardProject.parent!.id])
  ))

  const insertChanges = toCreate.map(info => {
    return {
      action: 'insert',
      index: 0,
      parent_id: info.parentNode.id,
      content: info.content,
      note: info.note
    }
  })

  const deleteChanges = toDelete.map(p => ({
    action: 'delete',
    node_id: p.id
  }))

  return [{
    fileID: projects.fileID,
    changes: [...deleteChanges, ...insertChanges, ...mirrorProjectTree(gtd, projects)] as NodeChange[]
  }]
}

function mirrorProjectTree (gtd: FileInfo, projects: FileInfo) {
  const treeNode = projects.nodeTree.child('Tree')

  if (!treeNode || treeNode.children.length > 0) {
    return []
  }

  const gtdProjects = getGTDProjects(gtd)

  const tree: any = {}
  let treeString = ''

  for (let gtdProject of gtdProjects) {
    const h3 = gtdProject.parent!.parent!
    const h4 = h3.parent!
    const h5 = h4.parent!

    tree[h5.content] = tree[h5.content] || {}
    tree[h5.content][h4.content] = tree[h5.content][h4.content] || {}
    tree[h5.content][h4.content][h3.content] = tree[h5.content][h4.content][h3.content] || []
    tree[h5.content][h4.content][h3.content].push(gtdProject.content)
  }

  for (let h5 in tree) {
    treeString += h5 + "\n"
    for (let h4 in tree[h5]) {
      treeString += "\t" + h4 + "\n"
      for (let h3 in tree[h5][h4]) {
        treeString += "\t\t" + h3 + "\n"
        for (let project of tree[h5][h4][h3]) {
          treeString += "\t\t\t" + project + "\n"
        }
      }
    }
  }

  return [{
    action: 'insert',
    index: 0,
    parent_id: treeNode.id,
    content: treeString,
  }]
}
