import configExample from './config.example'
import { join } from 'path'
import { readFile } from 'mz/fs'
import { Project, projectsToFlatEntities, Entity } from './project'
import lunr from 'lunr'
import { getURLFromID } from './node-url'
import { execSync, spawn } from 'child_process'
import { merge, fromEvent, interval, Subject, Subscription, fromEventPattern } from 'rxjs'
import { throttleTime, debounceTime } from 'rxjs/operators'

const configPath = join(__dirname, '../config.prod.js')
const dynalistProjectsFilepath = '/tmp/dynalistCurrentStateCerebro.json'
const config: typeof configExample = require(configPath)

let index: lunr.Index
let entities: { [key: string]: Entity }
buildIndexFromFile()
buildLatestIndex()

interface SearchEvent {
  term: string
  display: any
}

const updateInterval$ = interval(60 * 1000)
const searchEvents$ = new Subject<SearchEvent>()

export const initializeAsync = () => {
  merge(updateInterval$, searchEvents$)
    .pipe(throttleTime(10 * 1000))
    .subscribe(() => {
      buildLatestIndex()
    })
}

let subscription: Subscription
export const fn = ({ term, display }: SearchEvent) => {
  searchEvents$.next({ term, display })

  if (!subscription) {
    subscription = searchEvents$.pipe(debounceTime(200)).subscribe(({ term, display }) => {
      let normalizedTerm = term.trim()
      if (normalizedTerm[normalizedTerm.length - 1].match(/[a-zA-Z0-9]/)) {
        normalizedTerm += '*'
      }

      if (!index) {
        console.log('index is empty');
        return
      }

      let searchResult: lunr.Index.Result[]
      try {
         searchResult = index.search(normalizedTerm)
      } catch (e) {
        searchResult = []
      }
      let entitiesResult = searchResult.sort((a, b) => (a.score > b.score ? -1 : 1))
        .map(item => entities[item.ref])
        .slice(0, 10)

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
                      do JavaScript "Array.from(document.querySelectorAll(\\"div.DocumentItem-title\\")).find(x => x.innerText.includes(\\"Getting Things Done\\")).click();setTimeout(() => { location.href = \\"${projectUrl}\\" }, 100)" in current tab
                  end tell
            end tell
          `

        display({
          title: entity.title,
          subtitle: `${project.status} — ${project.title}`,
          icon: icons[entity.type],
          onSelect() {
            console.log('executing', appleScript);
            execSync(`osascript -e '${appleScript}'`)
          }
          // getPreview: () => '<pre>' + 'OMG' + '</pre>'
        })
      })
    })
  }
}

function buildLatestIndex() {
  const copyCommand = {
    cmd: 'scp',
    args: [
      'dev:~/dynalist-automator/tmp/dynalistCurrentState.json',
      dynalistProjectsFilepath
    ]
  }
  // NOTE: maybe scp removes the local file before syncing and thus any failed sync results in
  // a broken index because we've got either an empty or a corrupted file to parse

  console.log('SYNC: scp start');
  const copyProcess = spawn(copyCommand.cmd, copyCommand.args)
  copyProcess.on('close', () => {
    console.log('SYNC: scp finish');
    buildIndexFromFile()
  })
}

async function buildIndexFromFile() {
  const dynalistProjectsJson = (await readFile(dynalistProjectsFilepath)).toString()

  let projects: Project[]
  try {
    const projectsNew = JSON.parse(dynalistProjectsJson)
    projects = projectsNew
    console.log('SYNC: JSON parsed');
  } catch (e) {
    console.log('JSON.parse error', e.toString())
    return
  }

  entities = projectsToFlatEntities(projects)

  const searchDocument = Object.values(entities).map(e => ({
    id: e.node.id,
    title: e.title
  }))

  index = lunr(function() {
    this.field('title')

    searchDocument.forEach(e => this.add(e))
  })
  console.log('SYNC: index ready');
}
