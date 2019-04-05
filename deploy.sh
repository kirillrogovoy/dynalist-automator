#!/bin/bash
set -e
[[ -z $DYNALIST_TOKEN ]] && {
    echo "DYNALIST_TOKEN is not defined"
    exit 1
}

# parcel build --bundle-node-modules --target=node index.ts
tsc
rsync -r . kirill@116.203.48.207:/home/kirill/dynalist-automator
ssh 116.203.48.207 "DYNALIST_TOKEN=$DYNALIST_TOKEN /snap/bin/docker-compose -f /home/kirill/dynalist-automator/docker-compose.yml up -d dynalist-automator"
ssh 116.203.48.207 "DYNALIST_TOKEN=$DYNALIST_TOKEN /snap/bin/docker-compose -f /home/kirill/dynalist-automator/docker-compose.yml restart dynalist-automator"
