import { createApi } from './api'
import { ViewDefinition, defineView } from './view'
import { startPolling } from './polling'

const api = createApi({
  dynalistToken: process.env.DYNALIST_TOKEN!
})

console.log('test started')
const poll = startPolling(api, [
  'ByTj_o9vbqL7HratmcY3Tg5v',
  'k_VtXvAQE9i5mm39u91BRmiu'
])

const viewDefinition: ViewDefinition = {
  sourceFileId: 'ByTj_o9vbqL7HratmcY3Tg5v',
  targetFileId: 'k_VtXvAQE9i5mm39u91BRmiu',
  targetNodeId: '7_iP_x0UYgN-7FUnmR3flzez',
  getList: projects =>
    projects.map(p => ({ content: p.node.content, note: '' }))
}

defineView(api, poll, viewDefinition)
