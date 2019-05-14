import { exec } from 'mz/child_process';
import promisify from 'util.promisify';
import { interval } from 'rxjs';
import { flatMap, map, filter, mergeAll } from 'rxjs/operators';
import { diff, Diff, DiffNew } from 'deep-diff';
const execP = promisify(exec)

const fieldSeparator = '@@@'
const appleScript = `
on is_running(appName)
    tell application "System Events" to (name of processes) contains appName
end is_running

if not is_running("Safari")
  return ""
end if

tell application "Safari"

    set windowCount to number of windows
    set docText to ""

    repeat with x from 1 to windowCount
        set tabcount to number of tabs in window x

        repeat with y from 1 to tabcount
            set tabName to name of tab y of window x
            set tabURL to URL of tab y of window x

            set docText to docText & tabURL & "${fieldSeparator}" & tabName & linefeed as string
        end repeat

    end repeat
end tell

return docText
`

export interface Tab {
  url: string
  title: string
}

export type TabWithTimestamp = Tab & {
  createdAt: Date
}

export interface TabsByHash {
  [hash: string]: Tab
}

export type TabActivity = TabActivityNew | TabActivityClosed

export interface TabActivityNew {
  activity: 'new'
  tab: Tab
}

export interface TabActivityClosed {
  activity: 'closed'
  tab: Tab
}

export async function getTabs() {
  const rawOutput = (await execP(`osascript -e '${appleScript}'`)) as string

  return rawOutput.split('\n').filter(row => !!row && !row.includes('missing value')).map(row => {
    const [url, title] = row.split(fieldSeparator)
    const tab: Tab = {url, title}
    return tab
  })
}

export function getActivityStream() {
  let previousTabs: TabsByHash = {}
  return interval(3000).pipe(
    flatMap(() => getTabs()),
    map(tabs => {
      let tabsByHash: TabsByHash = {}
      for (let tab of tabs) {
        const hash = JSON.stringify(tab)
        tabsByHash[hash] = tab
      }

      const tabsDiffs = diff(previousTabs, tabsByHash)
      previousTabs = tabsByHash

      return tabsDiffs
    }),
    filter((diffs): diffs is (Diff<TabsByHash>[]) => diffs !== undefined),
    mergeAll(),
    filter((tabsDiff): tabsDiff is DiffNew<TabsByHash> => tabsDiff.kind === 'N'),
    map(tabsDiff => ({
      ...(tabsDiff.rhs as any as Tab),
      createdAt: new Date(),
    })),
  )
}
