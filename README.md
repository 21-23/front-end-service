# front-end-service

To run:
1. `echo "127.0.0.1       2123.dev" | sudo tee -a /etc/hosts`
2. `rm -f ./static/*`
3. `cd ../_qd-ui`
4. `yarn run build`
5. `cd ../front-end-service`
6. `cp -r ../_qd-ui/dist/* ./static/`
7. `yarn run start`
8. open in browser [http://2123.dev:3000/game.html?sessionId=qd-session](http://2123.dev:3000/game.html?sessionId=qd-session) [http://2123.dev:3000/game-master.html?sessionId=qd-session](http://2123.dev:3000/game-master.html?sessionId=qd-session)
