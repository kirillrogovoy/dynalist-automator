import { NodeTree } from './node-tree'
import later from 'later'

export class RecurringTask {
  public constructor (
    public node: NodeTree,
    public laterSched?: later.Timer
  ) {}
}
