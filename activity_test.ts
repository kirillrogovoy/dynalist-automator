import { createApi } from './api'
import { getActivityStream } from './activity'
import { startPolling } from './polling'
import { map } from 'rxjs/operators'
import { nodesToProjects } from './project'

const api = createApi({
  dynalistToken: process.env.DYNALIST_TOKEN!
})

console.log('test started')
const poll = startPolling(api, ['ByTj_o9vbqL7HratmcY3Tg5v'])

getActivityStream(
  poll.freshFileContent$.pipe(map(content => nodesToProjects(content.nodes))),
  '/tmp/dynalistCurrentState.json'
).subscribe(event => {
  console.log(event)
})
