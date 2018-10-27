import { NodeTree } from './node-tree'
import { NodeChangeInsert } from './api'
import { extractDateString } from './date'

export class Task {
  public constructor (
    public boardNode: NodeTree | 'none',
    public gtdNode: NodeTree | 'none',
    public project: NodeTree | 'none',
    public group: 'personal' | 'skyeng'
  ) {}

  public getContent () {
    if (this.project === 'none') {
      return 'no project'
    }

    if (this.boardNode !== 'none') {
      return this.boardNode.content.trim()
    }

    let prefix = ''
    if (this.gtdNode !== 'none') {
      const date = extractDateString(this.gtdNode.content)
      if (date) {
        prefix = `⏰ `
      }
    }

    const tags = getTags(this.project.note)
    return `${prefix}${this.getTitle()} ${tags.join(' ')}`.trim()
  }

  public getNote () {
    if (this.boardNode !== 'none') {
      return this.boardNode.note.trim()
    }

    if (this.project === 'none') {
      return 'no project'
    }
    return `Project: ${this.project.content} [ ](${this.project.url})`
  }

  public taskSignature () {
    return JSON.stringify([this.group, this.getContent(), this.getNote()])
  }

  public getTitle () {
    if (this.gtdNode === 'none') {
      return this.boardNode !== 'none'
        ? this.boardNode.content.trim()
        : '⚠️ [next task is not defined]'
    }

    return `🍏 ${this.gtdNode.content.trim()}`
  }
}

function getTags (input: string) {
  const regexp = /\#\w+/g
  const result = []
  while (true) {
    const match = regexp.exec(input)
    if (!match) {
      break
    }
    result.push(match[0])
  }

  return result
}
