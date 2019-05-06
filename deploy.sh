#!/bin/bash
set -e

# parcel build --bundle-node-modules --target=node index.ts
tsc
rsync -r ./dist/ dev:/home/kirill/dynalist-automator/dist/
# rsync -r . dev:/home/kirill/dynalist-automator
ssh dev "/snap/bin/docker-compose -f /home/kirill/dynalist-automator/docker-compose.yml up -d dynalist-automator"
ssh dev "/snap/bin/docker-compose -f /home/kirill/dynalist-automator/docker-compose.yml restart dynalist-automator"
