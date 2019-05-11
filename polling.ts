import { Node, API } from './api'
import { Observable, timer } from 'rxjs'
import { share } from 'rxjs/operators'

export interface PollFileContent {
  fileId: string
  nodes: Node[]
}

export interface PollSubscription {
  freshFileContent$: Observable<PollFileContent>
}

export function startPolling(api: API, fileIds: string[]): PollSubscription {
  const maxFileRequestsPerMinute = 60
  const filesCount = fileIds.length
  const maxRequestsPerFilePerMinute = maxFileRequestsPerMinute / filesCount
  const bestInterval = 60 / maxRequestsPerFilePerMinute
  const bestIntervalAdjasted = Math.ceil(bestInterval * 1.3)

  const timeoutTimer = () => timer(bestIntervalAdjasted * 1000).toPromise()
  const getContents = () => getContentOfMultipleFiles(api, fileIds)

  return {
    freshFileContent$: new Observable<PollFileContent>(observer => {
      let isActive = true
      ;(async () => {
        while (true) {
          if (!isActive) {
            return
          }

          try {
            const [, contents] = await Promise.all([
              timeoutTimer(),
              getContents()
            ])
            contents.forEach(c => observer.next(c))
          } catch (e) {
            console.error('API error', e)
          }
        }
      })()

      return () => {
        isActive = false
      }
    }).pipe(share())
  }
}

function getContentOfMultipleFiles(
  api: API,
  fileIds: string[]
): Promise<PollFileContent[]> {
  return Promise.all(
    fileIds.map(fileId =>
      api.file
        .content(fileId)
        .then(nodes => ({ fileId, nodes }))
        .catch((e: Error) => {
          if (e.toString().includes('status = 520')) {
            return {
              fileId,
              nodes: []
            }
          }

          throw e
        })
    )
  )
}
