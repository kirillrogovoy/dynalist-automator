import { createApi } from './api'
import configExample from './config.example'
import { join } from 'path'

const configPath = join(__dirname, '../config.prod.js')
const config: typeof configExample = require(configPath)

const api = createApi({
  dynalistToken: config.dynalistToken
})

export const fn = ({ term, display, update, actions }: any) => {
  term = term.replace(/^inbox/, '').trim()
  display({
    id: 1,
    title: `Add to inbox: ${term}`,
    icon:
      'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/320/apple/198/inbox-tray_1f4e5.png',
    onKeyDown(e: any) {
      if (e.keyCode === 13) {
        e.preventDefault()
        update(1, { subtitle: 'Adding...' })
        addToInbox(term)
          .then(() => {
            actions.hideWindow()
          })
          .catch(e => {
            update(1, { subtitle: `Error: ${e}` })
          })
      }
    }
  })
}

function addToInbox(term: string) {
  return api.file.change(config.files.inbox, [
    {
      action: 'insert',
      parent_id: 'root',
      index: -1,
      content: term
    }
  ])
}

export const keyword = 'inbox'
