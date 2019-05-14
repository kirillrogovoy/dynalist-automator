import configExample from './config.example'
import { ViewDefinition, NodeProposal } from './view'
import { Project } from './project'
import { getURLFromID } from './node-url'
import { Node } from './api'
import { emojify } from 'node-emoji'

export function getViews(config: typeof configExample): ViewDefinition[] {
  const defaultParams = {
    sourceFileId: config.files.source,
    targetFileId: config.files.views
  }

  function generateLifeWorkView(
    configKey: keyof typeof configExample.views,
    fn: (projects: Project[]) => NodeProposal[],
    viewDefinition: Partial<ViewDefinition> = {}
  ): [ViewDefinition, ViewDefinition] {
    return [
      {
        ...defaultParams,
        ...viewDefinition,
        targetNodeId: config.views[configKey][0],
        getList: projects =>
          fn(
            projects.filter(
              p => p.objectiveNode.content !== config.workObjectiveName
            )
          )
      },
      {
        ...defaultParams,
        ...viewDefinition,
        targetNodeId: config.views[configKey][1],
        getList: projects =>
          fn(
            projects.filter(
              p => p.objectiveNode.content === config.workObjectiveName
            )
          )
      }
    ]
  }

  function getURLToNode(node: Node) {
    return `[\u200B](${getURLFromID(defaultParams.sourceFileId, node.id)})`
  }

  return [
    ...generateLifeWorkView('projects', projects =>
      projects
        .filter(p => p.status === 'active')
        .sort(byModifiedDate)
        .map(p => ({ content: `${getURLToNode(p.node)} ${p.title}` }))
    ),
    {
      ...defaultParams,
      targetNodeId: config.views['q2'],
      getList: projects => {
        projects = projects.filter(p => p.labels.includes('q2'))
        const done = projects.filter(p => p.status === 'done')
        const notDone = projects.filter(p => p.status !== 'done')

        return [
          ...notDone.sort(byModifiedDate),
          ...done.sort(byModifiedDate)
        ].map(p => ({
          content: `${getURLToNode(p.node)} ${p.title}`,
          checked: p.node.checked,
          note: p.status === 'active' ? emojify(':fast_forward:') : ''
        }))
      }
    },
    ...generateLifeWorkView('todo', projects =>
      projects
        .filter(p => p.status === 'active')
        .sort(byModifiedDate)
        .map(project => {
          const readyTodos = project.todo.filter(
            todo => todo.status === 'ready'
          )
          const plannedTodos = project.todo.filter(
            todo => todo.status === 'planned'
          )
          const todoWarnings =
            readyTodos.length === 0 &&
            plannedTodos.length === 0 &&
            project.waiting.filter(w => w.status !== 'done').length === 0
              ? ['[no next task defined]']
              : []

          return [
            ...readyTodos.map(todo => ({
              content: emojify(`:green_apple: ${todo.title}`)
            })),
            ...todoWarnings.map(warining => ({
              content: emojify(`:warning: ${warining}`)
            }))
          ].map(p => ({
            ...p,
            note: `${getURLToNode(project.node)} ${project.title}`
          }))
        })
        .flat()
    ),
    ...generateLifeWorkView('waiting', projects =>
      projects
        .filter(p => p.status !== 'done')
        .sort(byModifiedDate)
        .map(project => {
          const waiting = project.waiting.filter(
            todo => todo.status === 'active'
          )

          return waiting.map(w => ({
            content: w.title,
            note: `${getURLToNode(project.node)} ${project.title}`
          }))
        })
        .flat()
    ),
    ...generateLifeWorkView(
      'history',
      projects =>
        projects
          .map(project => project.history)
          .flat()
          .filter(
            node => Date.now() - node.created < 86400000 /* 24 hours in ms */
          )
          .sort((a, b) => (a.created > b.created ? -1 : 1)),
      {
        throttleTime: 60 * 1000
      }
    )
  ]
}

function byModifiedDate(a: Project, b: Project) {
  return a.node.modified > b.node.modified ? -1 : 1
}
