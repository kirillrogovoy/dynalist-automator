import api, { NodeChange } from './api'
import { mirrorProjects } from './automations/mirror-projects'
import { mirrorTodo } from './automations/mirror-todo'
import { mirrorWaiting } from './automations/mirror-waiting'
import { processRecurring } from './automations/process-recurring'
import { writeHistory } from './automations/write-history'
import { buildFileInfoByID, fileIDByTitle } from './file'
import { RecurringTask } from './recurring-task'

const recurringTaskTimers: RecurringTask[] = []

async function main () {
  console.log('started')
  const maxFileRequestsPerMinute = 60
  const filesCount = Object.entries(fileIDByTitle).length
  const maxRequestsPerFilePerMinute = maxFileRequestsPerMinute / filesCount
  const bestInterval = 60 / maxRequestsPerFilePerMinute
  const bestIntervalAdjasted = Math.ceil(bestInterval * 1.3)

  while (true) {
    await Promise.all([
      waitForSeconds(bestIntervalAdjasted),
      performAllAutomations()
    ])
  }
}

async function performAllAutomations () {
  let files
  try {
    files = {
      gtd: await buildFileInfoByID(fileIDByTitle.gtd),
      projects: await buildFileInfoByID(fileIDByTitle.projects),
      todo: await buildFileInfoByID(fileIDByTitle.todo),
      waiting: await buildFileInfoByID(fileIDByTitle.waiting),
      recurring: await buildFileInfoByID(fileIDByTitle.recurring)
    }
  } catch (e) {
    console.error('api request error', e)
    return
  }

  const changeBuckets: { fileID: string, changes: NodeChange[] }[] = []
  const changesFromAutomations = [
    mirrorProjects(files.gtd, files.projects),
    mirrorTodo(files.gtd, files.todo),
    mirrorWaiting(files.gtd, files.waiting),
    processRecurring(recurringTaskTimers, files.recurring, files.todo),
    // writeHistory(fileIDByTitle.history, files)
  ]

  for (let changesSet of changesFromAutomations) {
    for (let change of changesSet) {
      let bucket = changeBuckets.find(x => x.fileID === change.fileID)
      if (!bucket) {
        bucket = {
          fileID: change.fileID,
          changes: []
        }
        changeBuckets.push(bucket)
      }

      bucket.changes.push(...change.changes)
    }
  }

  const nonEmptyBuckets = changeBuckets.filter(b => b.changes.length > 0)

  if (nonEmptyBuckets.length > 0) {
    console.log('changes', JSON.stringify(nonEmptyBuckets, null, 2))
    for (let bucket of nonEmptyBuckets) {
      if (bucket.changes.length > 0) {
        try {
          await api.file.change(bucket.fileID, bucket.changes)
        } catch (e) {
          console.error('change api error', e)
        }
      }
    }
  }
}

function waitForSeconds (seconds: number): Promise<null> {
  return new Promise(res => setTimeout(() => res(null), 1000 * seconds))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
