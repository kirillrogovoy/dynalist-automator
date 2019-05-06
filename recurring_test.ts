import { createApi } from './api'
import { startPolling } from './polling'
import { startPostingRecurring } from './recurring'

const api = createApi({
  dynalistToken: process.env.DYNALIST_TOKEN!
})

console.log('test started')
const poll = startPolling(api, ['ByTj_o9vbqL7HratmcY3Tg5v'])

const source = {
  fileId: 'ByTj_o9vbqL7HratmcY3Tg5v',
  nodeId: 'tKO44MaDpmq4wmxkW--v_EsI'
}

const target = {
  fileId: 'k_VtXvAQE9i5mm39u91BRmiu',
  nodeId: 'JIDVh4wx4W-ci760jF7VAH-t'
}

startPostingRecurring(api, poll, source, target)
