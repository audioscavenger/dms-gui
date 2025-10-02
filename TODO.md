## BUGS:
* [ ] - Newly created account doesn't appear on the list immediately (requires manual refresh)
* [x] - Translations do not update immediately after language change (requires manual refresh)
* [x] 1.0.3 - Fails to show accounts when QUOTA is disabled: now handles both cases
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
* [ ] - find a way for compose to only access dms and no other containers because some freaks are freaking out
* [ ] - backend: update emailValidChars based off what dms actually accepts: pretty sure ~ is not accepted
* [ ] - Implement functionality for the Settings page or remove it (currently mocked).
* [ ] - Should we rely on setup script or more simply read the files off dms directly?
* [ ] - Dashboard/aliases are correclty sorted
* [ ] - frontend/api.js and plenty other files could also use translate for their messages
* [ ] - frontend: find a way to force the first dashboard call to refresh=true
* [ ] - frontend/Settings: split data into multiple forms and columns
* [ ] - frontend/Settings: add option to not confirm deletions in handleDelete and others
* [ ] - frontend/accounts: addAccount correctly refresh after adding
* [x] 1.0.6 - removed nginx, now using node:slim as this is supposed to hide behind a proxy
* [x] 1.0.5.7 - backend:      add getSettings and saveSettings to db.settings.json
* [x] 1.0.5.7 - frontend/api: add getSettings and saveSettings to db.settings.json
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
* [x] 1.0.3 - Add information for future contributors (e.g., contribution guidelines).
* [x] 1.0.3 - Fix account regex when QUOTA is enabled or not
* [x] 1.0.3 - Better debug logging
* [x] 1.0.3 - Variabilize SETUP_SCRIPT
* [x] 1.0.3 - Initial commit from someone else's AI slop
