I work on this solo, until someone finds an interest like I do. Not claiming I can get to the level of complexity `Mailu` admin UI offers, but the goal is to have some usability.

The `setup` offered by DMS is quite good tbh, and sufficient for 90% of your daily operations. But sometimes a quick glance at a modern dashboard is also beneficial.

The primary goals are:

1. kick start the project: **done**, thanks to dunajdev
2. refactor, fix all the bugs, document and define scope: **done**
3. ability to load/save/refresh data from json files or dms commands: **done**
4. add rebuild/refresh xapian index buttons in Accounts page
5. add DNS entries page
6. add DKIM (re)gen option somewhere, maybe Accounts? with subsection by domain?
7. Ultimate goal: add DNS push entries with custom cloudflare API or octoDNS

After (7) my life will be complete and I won't need to work on this anymore :D

## BUGS:

* [ ] - the left menu is only as high as the window on first load, when you scroll down it's blank

## TODO:

The list is in reverse order, as you naturally read from top to bottom.

* [ ] - frontend+backend: refactoring in progress as advised by @polarathene
* [ ] - add a login page
* [ ] - PORT_NODEJS: package.json / .env / webpack etc... use hard coded 3001
* [ ] - translation: what are all those cannot* messages? no module uses them

* [ ] - backend: encrypt password in db.logins.json
* [ ] - backend: update emailValidChars based off what dms actually accepts: pretty sure ~ is not accepted

* [ ] - frontend/pages: add proxy to rspamd page?
* [ ] - frontend/pages: refactor Column definitions for accounts/alias/* table and load them from individual files
* [ ] - frontend/pages: refactor validate*Form and load them from individual files
* [ ] - frontend/pages: refactor handle*Change*() as they all do the same for different formData and load them from individual files
* [ ] - frontend/pages: refactor fetch*() into fetchData as they all do the same and load them from individual files
* [ ] - frontend/Dashboard:  add indexing status
* [ ] - frontend/Accounts:  add index reset/update commands
* [ ] - frontend/Dashboard:  add current hacking attempts
* [ ] - frontend/Settings: add option to not confirm deletions in handleDelete and others
* [ ] - frontend: api.js and plenty other files could also use translate for their error messages

* [x] 1.0.7.6 - bugfix in FormLogins.jsx as you cannot alter a const
* [x] 1.0.7.6 - api.js are all default export functions
* [x] 1.0.7.6 - getServerStatus can be refreshed, saves status in db
* [x] 1.0.7.5 - DataTable sorting algorith is perfect
* [x] 1.0.7.4 - removed @tanstack/react-table
* [x] 1.0.7.4 - added solumn sorting in DataTable
* [x] 1.0.7.3 - upgraded i18next react-dom webpack and added @tanstack/react-table
* [x] 1.0.7.2 - frontend/Settings: convert status.env into array of objects for DataTable
* [x] 1.0.7.2 - backend: getServerStatus also pulls docker env
* [x] 1.0.7.1 - Renamed TODO.md as CONTRIBUTING.md
* [x] 1.0.7 - massing cleanup, updated all README, updated swagger, all is working, release.
* [x] 1.0.6.5 - frontend/pages: loadingSpinner across the board
* [x] 1.0.6.5 - frontend/aliases: widen aliases table a little to accomodate 2 columns
* [x] 1.0.6.5 - frontend/accounts: widen accounts table a little to recieve the xapian sync buttons
* [x] 1.0.6.5 - backend/status: added bunch of internals to display on frontend/Settings
* [x] 1.0.6.5 - backend/index: correctly handle optional boolean query parameters with qs
* [x] 1.0.6.5 - backend/index: updated API calls descriptions
* [x] 1.0.6.5 - docker: create DMSGUI_VERSION and DMSGUI_DESCRIPTION entries in Dockerfile instead of relying on package.json
* [x] 1.0.6.4 - frontend/Settings: refactor FormFields and load independent JSX forms
* [x] 1.0.6.4 - docker: added chaingen.sh to generate TLSA entries for smtp and imap
* [x] 1.0.6.4 - backend/index: add api POST /api/logins
* [x] 1.0.6.4 - backend: add functions getLogins saveLogins
* [x] 1.0.6.4 - frontend/api: add api call getLogins saveLogins
* [x] 1.0.6.4 - frontend/Settings: split data into multiple forms and columns
* [x] 1.0.6.3 - removed python3 as octoDNS will be separate container
* [x] 1.0.6.3 - added python3 for octoDNS but I cannot get it working after 3 hours of labor
* [x] 1.0.6.3 - frontend/Dashboard: find a way to force the first load only to refresh=true
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
* [x] 1.0.4 - Upload my hard-forked container to hub.docker.com
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

## DECISIONS

* [ ] - Dashboard: there is no such thing as disk usage with docker. remove? yes. replace by what?
* [ ] - docker.sock seems frowned upon, why is it? Response from @polarathene:
  > The main concern is when giving write access to that API, you allow any compromised container with access to it to become root on the host (assuming rootful), which is obviously dangerous. This is less of a concern in more established projects where it may be used selectively out of trust, but smaller community projects it's a bigger ask for someone to trust the developer (the developer doesn't have to be malicious either, but is more likely at risk of being compromised themselves).
* [ ] - docker.sock seems frowned upon, how do we do without it? Maybe with Caddy and DMS api calls
* [-] - docker rootless seems simple enough but I am afraid of other consequences: https://docs.docker.com/engine/security/rootless/
* [ ] - docker.sock could become caddy: see https://github.com/orgs/docker-mailserver/discussions/4584
* [ ] - add fail2ban management?
* [ ] - add fail2ban status?
* [ ] - add mailbox statistics?
* [ ] - offer DKIM DMARC display etc?
* [-] - add clouflare API calls to update DKIM etc? see https://github.com/octodns/octodns but it's python; adds 99MB extra --> possible but nope we won't do that
* [-] - gave a try to octodns and after 2 hours of labor, i give up. always the same error and bad samples all over the internet, not a single example they give works at all. Research needed
* [x] - octodns will have its own container as discussed here https://github.com/orgs/docker-mailserver/discussions/4584
* [ ] - octodns may lack ability to modify/update and is designed to replace entire zones. Not sure it's the right tool
* [ ] - do we add multiple logins and roles?
* [-] - backend: separate server status from server info

<!--
search for base image with nodejs+py3:
| image | size | comment |
| ------------------------------------------- | ----- | ----------------------------------------- |
| node:24-alpine                              | 168MB |                                           |
| node:24-alpine dms-gui                      | 217MB | (virtual 217MB) has node v24              |
| node:24-alpine dms-gui +py3                 | 255MB | (virtual 255MB) has node v24              |
| node:24-alpine dms-gui +py3+pip             | 276MB | (virtual 276MB) has node v24              |
| debian:12-slim                              | 75MB  |                                           |
| debian:12-slim dms-gui +node18+py3          | 366MB | (virtual 366MB)                           |
| debian:13-slim                              | 79MB  |                                           |
| debian:13-slim dms-gui +node20+py3          | 393MB | (virtual 392MB)                           |
| docker-mailserver/docker-mailserver:latest  | 762MB | has py3 and requires +70MB for nodejs v18 |
| debian:13-slim                              | 79MB  | (virtual 261MB)                           |
| debian:13-slim +node20                      | 79MB  | +127MB                                    |
| debian:13-slim +node20-recommends           | 79MB  | +105MB                                    |
| debian:13-slim +py3                         | 79MB  | +443MB                                    |
| debian:13-slim +py3-recommends              | 79MB  | +38MB                                     |
| debian:13-slim +node20+py3-recommends       | 79MB  | +143MB                                    |
```
docker buildx build --no-cache -t dms-gui-24-alpine .
docker buildx build --no-cache -t dms-gui-12-slim .
docker buildx build --no-cache -t dms-gui-13-slim .

docker image pull debian:12-slim
docker image pull debian:13-slim
docker run --name debian13 debian:13-slim sleep infinity
docker exec -it debian13 sh
apt update
apt install nodejs
apt install nodejs --no-install-recommends
apt install python3 python3-pip
apt install python3 python3-pip --no-install-recommends
apt install python3 python3-pip --no-install-recommends
apt install nodejs python3 python3-pip
apt install nodejs python3 python3-pip --no-install-recommends
docker kill debian13
docker rm debian13
```


https://octodns.readthedocs.io/en/latest/index.html#providers
test https://octodns.readthedocs.io/en/latest/getting-started.html = total 302MB
mkdir -p octodns/config/octodns
cd octodns

# provider-specific-requirements would be things like: octodns-route53 octodns-azure
python -m venv env
source /app/octodns/env/bin/activate
pip install octodns octodns-cloudflare

# https://github.com/octodns/octodns-cloudflare/
vi /app/config/octodns/octodns.cloudflare.yaml
vi /app/config/octodns/domain.com.yaml

# https://octodns.readthedocs.io/en/latest/getting-started.html
octodns-validate  --config-file=/app/config/octodns.cloudflare.yaml
octodns-sync      --config-file=/app/config/octodns.cloudflare.yaml
octodns-sync      --config-file=/app/config/octodns.cloudflare.yaml --doit

octodns-sync --version
  # octoDNS 1.13.0

-->

