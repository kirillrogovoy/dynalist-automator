#!/bin/bash
[[ -z $DYNALIST_TOKEN ]] && {
    echo "DYNALIST_TOKEN is not defined"
    exit 1
}

rsync -r . proxy.rogovoy.me:/home/ec2-user/dynalist-automator
ssh proxy.rogovoy.me "DYNALIST_TOKEN=$DYNALIST_TOKEN /usr/local/bin/docker-compose -f /home/ec2-user/dynalist-automator/docker-compose.yml up -d dynalist-automator"
