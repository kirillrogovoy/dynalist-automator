import {getTabs, getActivityStream} from './safari-history'

// getTabs().then(x => console.log(x))

getActivityStream().subscribe(diff => console.log(JSON.stringify(diff, null, 2)))
