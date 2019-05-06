const files = {
  source: '',
  views: ''
}

export default {
  dynalistToken: 'TOKEN',
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
    q2: '',
  }
}