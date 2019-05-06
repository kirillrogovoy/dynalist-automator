import { createApi } from './api'
import { nodesToProjects } from './project'
import { inspect } from 'util'

const api = createApi({
  dynalistToken: process.env.DYNALIST_TOKEN!
})
;(async () => {
  const sourceNodes = await api.file.content('ByTj_o9vbqL7HratmcY3Tg5v')
  const projects = nodesToProjects(sourceNodes)

  console.log(
    'projects',
    inspect(
      projects.map(project => ({
        ...project,
        node: project.node.id,
        objectiveNode: project.objectiveNode.id
      })),
      undefined,
      100
    )
  )
})()
