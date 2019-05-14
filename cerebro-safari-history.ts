import { getActivityStream } from './safari-history';
import { createWriteStream } from 'fs';

const historyFileHandle = createWriteStream("/Users/kirillrogovoy/safari-history.txt", {flags:'a'});

getActivityStream().subscribe(tab => {
  const tabJson = JSON.stringify(tab)
  historyFileHandle.write(`${tabJson}\n`)
})

export const fn = () => {
}

