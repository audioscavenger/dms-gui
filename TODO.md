## BUGS:
## TODO:
* [ ] - add a login page
* [ ] - docker.sock seems frowned upon, how do we do without it?
* [ ] - docker.sock could be ssh: https://docs.docker.com/engine/security/protect-access/
* [ ] - PORT_NODEJS: package.json .env webpack etc... use hard coded 3001
* [ ] - Dashboard: add index section
* [ ] - backend/API: add index update command
* [ ] - Dashboard: add index update command
* [ ] - Dashboard: add current hacking attempts
* [ ] - Dashboard: there is no such thing as disk usage with docker. remove?
* [ ] - find a way for compose to only access dms and no other containers because it freaks out some
* [ ] - backend: update emailValidChars based off what dms actually accepts: pretty sure ~ is not accepted
* [ ] - Dashboard/aliases are correctly sorted OR use agGrid for headers sorting
* [ ] - frontend/api.js and plenty other files could also use translate for their error messages
* [ ] - frontend: find a way to force the first dashboard call to refresh=true
* [ ] - frontend/Settings: add option to not confirm deletions in handleDelete and others
* [ ] - frontend/Settings: split data into multiple forms and columns
* [x] 1.0.6.3 - update README with trick to access /docs
* [x] 1.0.6.3 - Should we rely on setup script or more simply read the regex/virtual files.cf off dms directly? --> NO because we still need to send commands anyway
* [x] 1.0.6.2 - backend: formatError removes colors too
* [x] 1.0.6.2 - frontend/index: all routes return actual error.message
* [x] 1.0.6.2 - frontend/accounts: addAccount correctly refresh after adding
* [x] 1.0.6.1 - frontend/settings show both backend and frontend versions
* [x] 1.0.6 - now using node:slim for build and 24-alpine for prod
* [x] 1.0.5.8 - massing update of all README
* [x] 1.0.5.8 - moved .env to /app/config/.dms-gui.env where it should be
* [x] 1.0.5.7 - backend:      add getSettings and saveSettings to db.settings.json
* [x] 1.0.5.7 - frontend/api: add getSettings and saveSettings to db.settings.json
* [x] 1.0.5.6 - backend: added formatError to extract actual error from module and transmit to front
* [x] 1.0.5.6 - frontend/Aliases: add the actual json response from backend/dM.js rather than the axios http 500 from services/api
* [x] 1.0.5.6 - addAlias correctly refresh after adding, updated api.js and index.js
* [x] 1.0.5.5 - implement DB_PATH
* [x] 1.0.5.4 - implement refresh on start
* [x] 1.0.5.3 - DB_JSON holds Aliases
* [x] 1.0.5.2 - Dashboard shows version next to server status
* [x] 1.0.5 - DB_JSON holds Accounts
* [x] 1.0.5 - backend: add DB_JSON=/app/config/db.json
* [x] 1.0.5 - frontend: add favicon.png with webpack.config.js; tried everything for 30mn, I give up
* [x] 1.0.4 - Implement shields.io badge
* [x] 1.0.4 - Upload my forked container to hub.docker.com
* [x] 1.0.4 - upgrade to 24-alpine
* [x] 1.0.4 - show node and project version at start
* [x] 1.0.4 - find a way to get the version from package.json into /api/status
* [x] 1.0.3 - Translations do not update immediately after language change (requires manual refresh)
* [x] 1.0.3 - Fails to show accounts when QUOTA is disabled: now handles both cases
* [x] 1.0.3 - Add non-woke code of conduct
* [x] 1.0.3 - Fix account regex when QUOTA is enabled or not
* [x] 1.0.3 - Better debug logging
* [x] 1.0.3 - Variabilize SETUP_SCRIPT
* [x] 1.0.3 - Initial commit from someone else's AI slop
