import { resolve } from 'url'
import fetchOrig from 'node-fetch'
const Queue = require('promise-queue')
const fetch: typeof fetchOrig = require('@zeit/fetch-retry')(fetchOrig)

export interface API {
  file: {
    list(): Promise<(File | Folder)[]>
    content(id: string): Promise<Node[]>
    change(id: string, changes: NodeChange[]): Promise<ChangeResponse>
  }
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
  children: NodeID[]
  checked: boolean
  created: number
  modified: number // ms
}

export interface NodeChangeInsert {
  action: 'insert'
  parent_id: string
  content: string
  index?: number
  note?: string
  checked?: boolean
}

export interface NodeChangeEdit {
  action: 'edit'
  node_id: string
  content: string
  note?: string
  checked?: boolean
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

export interface Request {
  dynalistToken: string
  urlFragment: string
  payload: Object
}

export interface ChangeResponse {
  newNodeIds: string[]
}

export type NodeChange =
  | NodeChangeInsert
  | NodeChangeEdit
  | NodeChangeMove
  | NodeChangeDelete

export type APIOptions = {
  dynalistToken: string
}

export function createApi(options: APIOptions): API {
  const dynalistToken = options.dynalistToken
  const concurrentTasks = 1
  const requestQueue = new Queue(concurrentTasks)

  return {
    file: {
      list(): Promise<(File | Folder)[]> {
        return makeRequest({
          urlFragment: 'file/list',
          payload: {},
          dynalistToken
        }).then(x => x.files)
      },
      content(id: string): Promise<Node[]> {
        console.log('calling api.content() for id', id);
        return makeRequest({
          urlFragment: 'doc/read',
          payload: { file_id: id },
          dynalistToken
        }).then(res =>
          res.nodes.map((node: Node) => ({
            children: [], // make children always present since the api might not return it
            ...node
          }))
        )
      },
      change(id: string, changes: NodeChange[]) {
        console.log('change api call', changes)
        if (changes.length === 0) {
          return Promise.resolve({
            newNodeIds: []
          })
        }
        return requestQueue
          .add(() =>
            makeRequest({
              urlFragment: 'doc/edit',
              payload: {
                file_id: id,
                changes
              },
              dynalistToken
            })
          )
          .then(
            (responseBody: any): ChangeResponse => ({
              newNodeIds: responseBody.new_node_ids
            })
          )
      }
    }
  }
}

function makeRequest(request: Request) {
  const token = request.dynalistToken
  const payloadToSend = { ...request.payload, token }
  const url = buildUrl(request.urlFragment)

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(payloadToSend)
  }).then(async res => {
    if (res.status !== 200) {
      const body = (await res.blob()).toString()
      throw new Error(
        `HTTP Response with status = ${res.status}, ${url}, ${JSON.stringify(
          payloadToSend
        )}, ${JSON.stringify(body)}`
      )
    }

    const body = await res.json()
    if (body._code !== 'Ok') {
      throw new Error(
        `HTTP Response _code != Ok, ${url}, ${JSON.stringify(body)}`
      )
    }

    return body
  })
}

function buildUrl(fragment: string) {
  return resolve('https://dynalist.io/api/v1/', fragment)
}
