import { Observable, of } from 'rxjs'
import {
  Project,
  Entity,
  projectsToFlatEntities,
  HISTORY_NODE_TITLE
} from './project'
import { flatMap, share } from 'rxjs/operators'
import { exists, readFile, writeFile } from 'mz/fs'
import { diff } from 'deep-diff'

export type ActivityEvent =
  | ActivityEventNew
  | ActivityEventChange
  | ActivityEventRemoval

export interface ActivityEventNew {
  type: 'new'
  project: Project
  entity: Entity
}

export interface ActivityEventChange {
  type: 'change'
  project: Project
  entity: Entity
  changedKey: keyof Entity
  oldValue: any
  newValue: any
}

export interface ActivityEventRemoval {
  type: 'removal'
  project: Project
  entity: Entity
}

export function getActivityStream(
  projects$: Observable<Project[]>,
  localStateFilePath: string
) {
  return projects$.pipe(
    flatMap(async newState => {
      const newStateJson = JSON.stringify(newState)
      const localStateFileExists = await exists(localStateFilePath)
      const localStateJson = localStateFileExists
        ? (await readFile(localStateFilePath)).toString()
        : newStateJson

      await writeFile(localStateFilePath, newStateJson)

      return {
        newState: JSON.parse(newStateJson) as Project[],
        localState: JSON.parse(localStateJson) as Project[]
      }
    }),
    flatMap(({ newState, localState }) => {
      const newStateFlat = projectsToFlatEntities(newState)
      const localStateFlat = projectsToFlatEntities(localState)

      const changes =
        diff(localStateFlat, newStateFlat, (path, key) => {
          return (
            ['node', 'projectNode', 'history', 'historyNodeId'].includes(key) ||
            (path.length === 1 && ['todo', 'waiting'].includes(key))
          )
        }) || []

      const activityEvents: ActivityEvent[] = changes.map(change => {
        const nodeId = change.path![0]
        const entity = newStateFlat[nodeId] || localStateFlat[nodeId]
        const projectNodeId =
          entity.type === 'project' ? entity.node.id : entity.projectNode.id
        const project = (newStateFlat[projectNodeId] ||
          localStateFlat[projectNodeId]) as Project

        if (change.kind === 'N') {
          const event: ActivityEventNew = {
            type: 'new',
            entity,
            project
          }
          return event
        }

        if (change.kind === 'D') {
          const event: ActivityEventRemoval = {
            type: 'removal',
            entity,
            project
          }
          return event
        }

        const changedKey: keyof Entity = change.path![1]
        const event: ActivityEventChange = {
          type: 'change',
          entity,
          project,
          changedKey,
          oldValue: localStateFlat[nodeId][changedKey],
          newValue: entity[changedKey]
        }
        return event
      })

      return of(...activityEvents)
    }),
    share()
  )
}
