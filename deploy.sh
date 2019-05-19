#!/bin/bash
set -e

# parcel build --bundle-node-modules --target=node index.ts
tsc
rsync -r ./node_modules/ dev:/home/kirill/dynalist-automator/node_modules/
rsync -r ./config.prod.js dev:/home/kirill/dynalist-automator/
rsync -r ./docker-compose.yml dev:/home/kirill/dynalist-automator/docker-compose.yml
rsync -r ./dist/ dev:/home/kirill/dynalist-automator/dist/
# rsync -r . dev:/home/kirill/dynalist-automator
ssh dev "/snap/bin/docker-compose -f /home/kirill/dynalist-automator/docker-compose.yml up -d dynalist-automator-kirillrogovoy"
ssh dev "/snap/bin/docker-compose -f /home/kirill/dynalist-automator/docker-compose.yml restart dynalist-automator-kirillrogovoy"
