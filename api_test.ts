import { createApi, NodeChangeInsert } from './api'

const api = createApi({
  dynalistToken: process.env.DYNALIST_TOKEN!
})
;(async () => {
  await api.file.list().then(nodes => console.log('files', nodes))
  await api.file
    .content('ByTj_o9vbqL7HratmcY3Tg5v')
    .then(nodes => console.log('nodes', nodes))

  const change: NodeChangeInsert = {
    action: 'insert',
    parent_id: 'root',
    content: 'hello from api',
    index: 0,
    note: 'im a note',
    checked: false
  }
  api.file.change('ByTj_o9vbqL7HratmcY3Tg5v', [change])
  api.file.change('ByTj_o9vbqL7HratmcY3Tg5v', [change])
})()
