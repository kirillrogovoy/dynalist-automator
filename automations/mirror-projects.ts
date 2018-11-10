import api, { NodeChange } from '../api'
import { NodeTree } from '../node-tree'
import { getIDFromURL } from '../node-url'
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
    changes: [...deleteChanges, ...insertChanges] as NodeChange[]
  }]
}
