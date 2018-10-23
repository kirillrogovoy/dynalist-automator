import api, { File, Folder } from './api'
import { NodeTree, buildTree } from './node-tree'

export interface FileInfo {
  fileID: string
  nodeTree: NodeTree
}

export const fileIDByTitle = {
  gtd: 'x6h7Kwv2IIU2Deea48x7DSQY',
  projects: 'eWca1RrxFPY5evUFXQ0n9xOw',
  todo: 'eMtVpRvyXfxDbsfSm5YedeSX',
  waiting: '5-McZ7W8ha1H7lbLLXtr5dG5',
  recurring: 'KbOzxczoyBO4xkMz_eM0qUK-'
}

export async function buildFileInfoByID (fileID: string): Promise<FileInfo> {
  const nodes = await api.file.content(fileID)
  return {
    fileID,
    nodeTree: buildTree(fileID, nodes)
  }
}
