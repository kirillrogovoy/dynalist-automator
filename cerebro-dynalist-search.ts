import configExample from './config.example'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { Project, projectsToFlatEntities, Entity } from './project'
import lunr from 'lunr'
import { getURLFromID } from './node-url'
import { execSync, spawn } from 'child_process'
import { merge, fromEvent, interval, Subject } from 'rxjs'
import { throttleTime, mapTo } from 'rxjs/operators'

const configPath = join(__dirname, '../config.prod.js')
const config: typeof configExample = require(configPath)

let index: lunr.Index
let entities: { [key: string]: Entity }
buildLatestIndex()

const updateInterval$ = interval(60 * 1000)
const searchEvents$ = new Subject<void>()

merge(updateInterval$.pipe(), searchEvents$)
  .pipe(throttleTime(10 * 1000))
  .subscribe(() => {
    buildLatestIndex()
  })

export const fn = ({ term, display }: any) => {
  searchEvents$.next()
  let entitiesResult = index
    .search(term.trim() + '*')
    .sort((a, b) => (a.score > b.score ? -1 : 1))
    .map(item => entities[item.ref])

  entitiesResult = [
    ...entitiesResult.filter(e => e.status === 'active'),
    ...entitiesResult.filter(e => e.status !== 'active' && e.status !== 'done'),
    ...entitiesResult.filter(e => e.status === 'done')
  ]

  entitiesResult.forEach(entity => {
    const project =
      entity.type === 'project'
        ? entity
        : (entities[entity.projectNode.id] as Project)

    const icons = {
      project:
        'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/198/triangular-flag-on-post_1f6a9.png',
      todo:
        'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/198/green-apple_1f34f.png',
      waiting:
        'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/198/hourglass-with-flowing-sand_23f3.png'
    }

    const projectUrl = getURLFromID(config.files.source, project.node.id)

    const appleScript = `
        tell application "Safari"
              tell front window
                  set current tab to tab 1
                  set URL of current tab to "${projectUrl}"
              end tell
        end tell
      `

    display({
      title: entity.title,
      subtitle: `${project.status} — ${project.title}`,
      icon: icons[entity.type],
      onSelect() {
        execSync(`osascript -e '${appleScript}'`)
      }
      // getPreview: () => '<pre>' + 'OMG' + '</pre>'
    })
  })
}

async function buildLatestIndex() {
  const dynalistProjectsFilepath = '/tmp/dynalistCurrentStateCerebro.json'

  const copyCommand = {
    cmd: 'scp',
    args: [
      'dev:~/dynalist-automator/tmp/dynalistCurrentState.json',
      `/tmp/dynalistCurrentStateCerebro.json`
    ]
  }
  const copyProcess = spawn(copyCommand.cmd, copyCommand.args)

  const copyProcessPromise = fromEvent(copyProcess, 'close').toPromise()
  if (!existsSync(dynalistProjectsFilepath)) {
    await copyProcessPromise
  }

  const projects: Project[] = JSON.parse(
    readFileSync(dynalistProjectsFilepath).toString()
  )
  entities = projectsToFlatEntities(projects)

  const document = Object.values(entities).map(e => ({
    id: e.node.id,
    title: e.title
  }))

  index = lunr(function() {
    this.field('title')

    document.forEach(e => this.add(e))
  })
}
