import { API, NodeChangeInsert } from './api'
import {
  ActivityEvent,
  ActivityEventNew,
  ActivityEventChange
} from './activity'
import { Observable } from 'rxjs'
import { HISTORY_NODE_TITLE } from './project'
import { dateToDynalistFormat } from './date'
import { diffLines } from 'diff'
import { groupBy, mergeMap, map, buffer, debounceTime } from 'rxjs/operators'

export function logActivityEvents(
  api: API,
  projectsTargetFileId: string,
  activityEvents$: Observable<ActivityEvent>
) {
  return activityEvents$
    .pipe(
      groupBy(event => {
        const nodeId = event.entity.node.id
        let changedKey =
          event.type === 'change'
            ? event.changedKey
            : event.type === 'new'
            ? 'title'
            : null
        return changedKey ? `${nodeId}_${changedKey}` : 'other'
      }),
      mergeMap(group =>
        group.key === 'other'
          ? group
          : group.pipe(
              buffer(group.pipe(debounceTime(30 * 1000))),
              map(
                (events): ActivityEvent => {
                  const firstEvent = events[0]
                  const lastEvent = events[events.length - 1]
                  if (firstEvent.type === 'new') {
                    const reducedEvent: ActivityEventNew = {
                      ...firstEvent,
                      entity: lastEvent.entity,
                      project: lastEvent.project
                    }
                    return reducedEvent
                  }

                  const reducedEvent: ActivityEventChange = {
                    ...(lastEvent as ActivityEventChange),
                    oldValue: (firstEvent as ActivityEventChange).oldValue
                  }
                  return reducedEvent
                }
              )
            )
      )
    )
    .subscribe(async activityEvent => {
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
          .trim()
      : ''

  return {
    base: baseString,
    change: changeString
  }
}
