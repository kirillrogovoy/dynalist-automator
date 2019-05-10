import { API, NodeChangeInsert } from './api'
import { ActivityEvent } from './activity'
import { Observable } from 'rxjs'
import { HISTORY_NODE_TITLE } from './project'
import { dateToDynalistFormat } from './date'
import { diffLines } from 'diff'

export function logActivityEvents(
  api: API,
  projectsTargetFileId: string,
  activityEvents$: Observable<ActivityEvent>
) {
  return activityEvents$.subscribe(async activityEvent => {
    const project = activityEvent.project

    let historyNodeId = activityEvent.project.historyNodeId
    if (!historyNodeId) {
      const insertHistoryNodeChange: NodeChangeInsert = {
        action: 'insert',
        parent_id: project.node.id,
        content: HISTORY_NODE_TITLE
      }
      historyNodeId = (await api.file.change(projectsTargetFileId, [
        insertHistoryNodeChange
      ])).newNodeIds[0]
    }

    const printable = activityEventToPrintable(activityEvent)
    const insertNewHistoryChange: NodeChangeInsert = {
      action: 'insert',
      parent_id: historyNodeId,
      content: printable.base,
      note: printable.change
    }

    await api.file.change(projectsTargetFileId, [insertNewHistoryChange])
  })
}

function activityEventToPrintable(activityEvent: ActivityEvent) {
  const { type, entity } = activityEvent
  const date = dateToDynalistFormat(
    new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }))
  )

  const baseString = `${date} — ${type} — ${entity.type} — ${entity.title}`
  const changeString =
    activityEvent.type === 'change'
      ? [
          `${activityEvent.changedKey}:`,
          activityEvent.changedKey !== 'informationString'
            ? [`${activityEvent.oldValue} > ${activityEvent.newValue}`]
            : [
                '',
                ...diffLines(activityEvent.oldValue, activityEvent.newValue)
                  .filter(change => change.added || change.removed)
                  .map(change =>
                    change.added
                      ? `+ ${change.value}`
                      : change.removed
                      ? `- ${change.value}`
                      : ''
                  )
              ].join('\n')
        ]
          .flat()
          .join('')
      : ''

  return {
    base: baseString,
    change: changeString
  }
}
