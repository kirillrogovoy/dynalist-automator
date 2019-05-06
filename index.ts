require('source-map-support').install()
import { createApi } from './api'
import { startPolling } from './polling'
import { startPostingRecurring } from './recurring'
import { filter, map } from 'rxjs/operators'
import { nodesToProjects } from './project'
import { getActivityStream } from './activity'
import { defineView } from './view'
import configExample from './config.example'
import { join } from 'path'
import { getViews } from './views'

async function main() {
  const firstArg = process.argv[2]
  if (!firstArg) {
    console.error('No config file specified')
    process.exit(1)
  }
  const configPath = join(process.cwd(), firstArg)
  console.log('Trying config file', configPath)
  const config: typeof configExample = require(configPath)

  console.log('started')

  const api = createApi({
    dynalistToken: config.dynalistToken
  })

  const pollSubscription = startPolling(api, Object.values(config.files))

  const projects$ = pollSubscription.freshFileContent$.pipe(
    filter(content => content.fileId === config.files.source),
    map(content => nodesToProjects(content.nodes))
  )

  getActivityStream(projects$, '/tmp/dynalistCurrentState.json').subscribe(
    event => console.log('event', event.type, event.entity.type, event.entity.title, event.type === 'change' ? [event.oldValue, event.newValue]: '')
  )

  startPostingRecurring(
    api,
    pollSubscription,
    config.recurring.source,
    config.recurring.target
  )

  for (let viewDefinition of getViews(config)) {
    defineView(api, pollSubscription, viewDefinition)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
