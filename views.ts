import configExample from './config.example'
import { ViewDefinition, NodeProposal } from './view'
import { Project } from './project'
import { getURLFromID } from './node-url'
import { Node } from './api'
import { emojify } from 'node-emoji'
import {hasDate} from './date';

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
        getList: projects => fn(projects.filter(isWorkProject))
      }
    ]
  }

  function getURLToNode(node: Node) {
    return `[\u200B](${getURLFromID(defaultParams.sourceFileId, node.id)})`
  }

  function isWorkProject(p: Project) {
    return p.objectiveNode.content === config.workObjectiveName || p.labels.includes('work')
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
      targetNodeId: config.views.q3,
      getList: projects => {
        projects = projects.filter(p => p.labels.includes('q3'))
        const done = projects.filter(p => p.status === 'done')
        const notDone = projects.filter(p => p.status !== 'done')

        return [
          ...notDone.sort((a, b) => a.status === b.status ? 0 : a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0),
          ...done.sort(byModifiedDate)
        ].map(p => ({
          content: `${getURLToNode(p.node)} ${p.title}`,
          checked: p.node.checked,
          note: p.status === 'active' ? emojify(':fast_forward:') : ''
        }))
      }
    },
    {
      ...defaultParams,
      targetNodeId: config.views.q3_unplanned,
      getList: projects => {
        projects = projects.filter(p => !isWorkProject(p) && !p.labels.includes('q3') && ((p.status === 'done' && p.node.modified > new Date('2019-07-01').getTime()) || (p.status === 'active')))
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
    {
      ...defaultParams,
      targetNodeId: config.views.q4,
      getList: projects => {
        projects = projects.filter(p => p.labels.includes('q4'))
        const done = projects.filter(p => p.status === 'done')
        const notDone = projects.filter(p => p.status !== 'done')

        return [
          ...notDone.sort((a, b) => a.status === b.status ? 0 : a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0),
          ...done.sort(byModifiedDate)
        ].map(p => ({
          content: `${getURLToNode(p.node)} ${p.title}`,
          checked: p.node.checked,
          note: p.status === 'active' ? emojify(':fast_forward:') : ''
        }))
      }
    },
    {
      ...defaultParams,
      targetNodeId: config.views.q4_unplanned,
      getList: projects => {
        projects = projects.filter(p => !isWorkProject(p) && !p.labels.includes('q4') && ((p.status === 'done' && p.node.modified > new Date('2019-10-01').getTime()) || (p.status === 'active')))
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
      [ ...projects
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
            ...readyTodos.map(todo => {
              const emojis = [
                'green_apple',
                project.deadline || todo.deadline ? 'hourglass' : null,
                project.labels.includes('blocker') || todo.labels.includes('blocker') ? 'no_entry_sign' : null,
                project.labels.includes('do-now') || todo.labels.includes('do-now') ? 'fire' : null,
              ].filter(x => !!x).map(x => `:${x}:`).join(' ')
              return {
                content: emojify(`${emojis} ${todo.title}`),
                priorityScore: todo.priorityScore,
              }}),
            ...todoWarnings.map(warning => ({
              content: emojify(`:warning: ${warning}`),
              priorityScore: Number.POSITIVE_INFINITY,
            }))
          ].map(p => ({
            ...p,
            note: `${getURLToNode(project.node)} ${project.title}`
          }))
        })
        .flat()
        .sort((a, b) => b.priorityScore - a.priorityScore),
      ...projects
        .filter(p => p.status === 'inactive')
        .sort(byModifiedDate)
        .flatMap(project => project.todo
          .filter(todo => todo.status === 'ready'  && hasDate(todo.title))
          .map(todo => ({
            content: emojify(`:hourglass: ${todo.title}`),
            priorityScore: todo.priorityScore,
            note: `${getURLToNode(project.node)} ${project.title}`,
          }))
        )
      ]
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
    // ...generateLifeWorkView(
      // 'history',
      // projects =>
        // projects
          // .map(project => project.history)
          // .flat()
          // .filter(
            // node => Date.now() - node.created < 129600000 [> 36 hours in ms <]
          // )
          // .sort((a, b) => (a.created > b.created ? -1 : 1)),
      // {
        // throttleTime: 60 * 1000
      // }
    // )
  ]
}

function byModifiedDate(a: Project, b: Project) {
  return a.node.modified > b.node.modified ? -1 : 1
}
