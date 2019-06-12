import { getActivityStream } from './safari-history';
import { createWriteStream } from 'fs';

console.log('init')
export const initializeAsync = () => {
  const historyFileHandle = createWriteStream("/Users/kirillrogovoy/safari-history.txt", {flags:'a'});

  getActivityStream().subscribe(tab => {
    const tabJson = JSON.stringify(tab)
    historyFileHandle.write(`${tabJson}\n`)
  })
}

export const fn = () => {
}

