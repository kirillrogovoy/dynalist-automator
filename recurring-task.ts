import { NodeTree } from './node-tree'
import { Timer } from 'later'

export class RecurringTask {
  public constructor (
    public node: NodeTree,
    public laterSched?: Timer
  ) {}
}
