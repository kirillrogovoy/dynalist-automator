import fetch from 'node-fetch'
import url from 'url'

const token = process.env.DYNALIST_TOKEN

if (!token) {
  throw new Error('env var DYNALIST_TOKEN not found')
}

export interface File {
  id: string
  permission: number
  title: string
  type: 'document'
}

export interface Folder {
  id: string
  permission: number
  title: string
  type: 'folder'
  children: string[]
  collapsed: boolean
}

export type NodeID = string
export interface Node {
  id: NodeID
  content: string
  note: string
  children?: NodeID[]
  checked: boolean
}

export interface NodeChangeInsert {
  action: 'insert'
  parent_id: string
  content: string
  index?: number
  note?: string
  checked?: string
}

export interface NodeChangeEdit {
  action: 'edit'
  node_id: string
  content: string
  note?: string
  checked?: string
}

export interface NodeChangeMove {
  action: 'move'
  node_id: string
  parent_id: string
  index: number
}

export interface NodeChangeDelete {
  action: 'delete'
  node_id: string
}

export type NodeChange = NodeChangeInsert | NodeChangeEdit | NodeChangeMove | NodeChangeDelete

export default {
  file: {
    list (): Promise<(File | Folder)[]> {
      return makeRequest('file/list').then(x => x.files)
    },
    content (id: string): Promise<Node[]> {
      return makeRequest('doc/read', { file_id: id }).then(x => x.nodes)
    },
    change (id: string, changes: NodeChange[]): Promise<undefined> {
      return makeRequest('doc/edit', {
        file_id: id,
        changes
      }).then(x => x.nodes)
    }
  }
}

function makeRequest (urlFragment: string, payload: object = {}) {
  const payloadBase = { token }
  const payloadToSend = { ...payloadBase, ...payload }
  const url = buildUrl(urlFragment)

  console.log(url, payloadToSend)
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(payloadToSend)
  }).then(async res => {
    if (res.status !== 200) {
      throw new Error(`HTTP Response with status != 200, ${url}, ${JSON.stringify(payloadToSend)}`)
    }
    const body = await res.json()

    if (body._code !== 'Ok') {
      throw new Error(`HTTP Response _code != Ok, ${url}, ${JSON.stringify(body)}`)
    }

    return body
  })
}

function buildUrl (fragment: string) {
  return url.resolve('https://dynalist.io/api/v1/', fragment)
}
