const files = {
  source: '',
  views: '',
  inbox: ''
}

export default {
  dynalistToken: 'TOKEN',
  workObjectiveName: 'Skyeng',
  files,
  recurring: {
    source: {
      fileId: files.source,
      nodeId: ''
    },
    target: {
      fileId: files.views,
      nodeId: ''
    }
  },
  views: {
    projects: ['', ''],
    todo: ['', ''],
    waiting: ['', ''],
    history: ['', ''],
    q2: '',
    q2_unplanned: '',
    q3: '',
    q3_unplanned: '',
    q4: '',
    q4_unplanned: '',
  }
}
