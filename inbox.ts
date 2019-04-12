import api from './api'
import { fileIDByTitle } from './file'

async function main () {
  process.stdin.on('readable', async () => {
    const input = process.stdin.read()
    if (input) {
      api.file.change(fileIDByTitle.inbox, [{
        action: 'insert',
        parent_id: 'root',
        index: -1,
        content: input.toString().trim()
      }])
    }
  })
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

setTimeout(() => {
  process.exit(0)
}, 5000)
