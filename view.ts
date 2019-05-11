import { Node, API, NodeChangeDelete, NodeChangeInsert } from './api'
import { Project, nodesToProjects, nodesToMap } from './project'
import {
  map,
  filter,
  distinctUntilChanged,
  catchError,
  throttleTime
} from 'rxjs/operators'
import { combineLatest, Unsubscribable } from 'rxjs'
import { PollSubscription } from './polling'

export interface ViewDefinition {
  sourceFileId: string
  targetFileId: string
  targetNodeId: string
  throttleTime?: number
  getList(projects: Project[]): NodeProposal[]
}

export interface NodeProposal {
  content: string
  note?: string
  checked?: boolean
}

export function defineView(
  api: API,
  pollSubscription: PollSubscription,
  viewDefinition: ViewDefinition
): Unsubscribable {
  const projects$ = pollSubscription.freshFileContent$.pipe(
    filter(({ fileId }) => fileId === viewDefinition.sourceFileId),
    map(({ nodes }) => nodesToProjects(nodes))
  )

  const proposedNodeList$ = projects$.pipe(
    map(projects => viewDefinition.getList(projects))
  )

  const currentNodeList$ = pollSubscription.freshFileContent$.pipe(
    filter(({ fileId }) => fileId === viewDefinition.targetFileId),
    map(({ nodes }) => nodesToMap(nodes)),
    map(nodeById => {
      const viewNode = nodeById.get(viewDefinition.targetNodeId)!
      const childrenNodes = viewNode.children.map(id => nodeById.get(id)!)

      return childrenNodes
    })
  )

  return combineLatest(currentNodeList$, proposedNodeList$)
    .pipe(
      filter(
        ([nodes, proposals]) => !isNodesFittingProposals(nodes, proposals)
      ),
      viewDefinition.throttleTime
        ? throttleTime(viewDefinition.throttleTime)
        : map(x => x),
      map(([nodes, proposals]) => {
        const nodeRemovals = nodes.map(
          (node): NodeChangeDelete => ({
            action: 'delete',
            node_id: node.id
          })
        )

        const nodeInserts = proposals.map(
          (proposal): NodeChangeInsert => ({
            action: 'insert',
            parent_id: viewDefinition.targetNodeId,
            content: proposal.content,
            note: proposal.note,
            checked: proposal.checked,
            index: 9999
          })
        )

        return {
          fileId: viewDefinition.targetFileId,
          changes: [...nodeInserts, ...nodeRemovals]
        }
      }),
      distinctUntilChanged(), // avoid repeating the same requests
      map(({ fileId, changes }) => {
        api.file.change(fileId, changes).catch((e: Error) => {
          if (e.toString().includes("Can't find node with id")) {
            return
          }
          throw e
        })
      }),
      catchError((_, caught) => caught)
    )
    .subscribe()
}

function isNodesFittingProposals(nodes: Node[], proposals: NodeProposal[]) {
  const nodesStripped = nodes.map(node => ({
    content: node.content,
    note: node.note || '',
    checked: Boolean(node.checked)
  }))

  proposals = proposals.map(proposal => ({
    content: proposal.content,
    note: proposal.note || '',
    checked: Boolean(proposal.checked)
  }))

  // if (JSON.stringify(nodesStripped) !== JSON.stringify(proposals)) {
  // console.log('diff', JSON.stringify(nodesStripped, null, 2), JSON.stringify(proposals, null, 2))
  // }

  return JSON.stringify(nodesStripped) === JSON.stringify(proposals)
}
