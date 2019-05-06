import { API } from './api'
import { ActivityEvent } from './activity'
import { Observable } from 'rxjs'

export interface DatedLogsTarget {
  fileId: string
  nodeId: string
}

export function logActivityEvents(
  api: API,
  datedLogsTarget: DatedLogsTarget,
  projectsTargetFileId: string,
  activityEvents$: Observable<ActivityEvent>
) {
  return activityEvents$.subscribe(async activityEvent => {
    if (!activityEvent.project.logsNodeId) {
      // api.file.change(projectsTargetFileId, [{}])
    }
  })
}
