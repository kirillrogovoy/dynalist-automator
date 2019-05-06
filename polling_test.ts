import { createApi } from './api'
import { startPolling } from './polling'

const api = createApi({
  dynalistToken: process.env.DYNALIST_TOKEN!
})

const sub = startPolling(api, [
  'ByTj_o9vbqL7HratmcY3Tg5v'
]).freshFileContent$.subscribe(x => console.log('x', x))

setTimeout(() => sub.unsubscribe(), 5000)
