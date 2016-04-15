#!/bin/bash

ssh lessboring@lessboring.com 'mkdir -p /home/lessboring/public_html/ludumdare35'
ssh lessboring@lessboring.com 'rm -r /home/lessboring/public_html/ludumdare35/*'

cd assets
zip -r game.zip *
scp game.zip lessboring@lessboring.com:/home/lessboring/public_html/ludumdare35
ssh lessboring@lessboring.com 'cd /home/lessboring/public_html/ludumdare35/ && unzip game.zip && rm game.zip'
rm game.zip
