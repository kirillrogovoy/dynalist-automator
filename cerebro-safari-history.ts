import { getActivityStream } from './safari-history';
import { createWriteStream } from 'fs';

console.log('init')
export const initializeAsync = () => {
  console.log('load')
  // if ((process as any).SAFARI_HISTORY_LOADED) {
    // return
  // }

  console.log('load 2')
  ;(process as any).SAFARI_HISTORY_LOADED = true

  const historyFileHandle = createWriteStream("/Users/kirillrogovoy/safari-history.txt", {flags:'a'});

  getActivityStream().subscribe(tab => {
    const tabJson = JSON.stringify(tab)
    console.log('writing to file!') // 5!
    historyFileHandle.write(`${tabJson}\n`)
  })
}

export const fn = () => {
}

