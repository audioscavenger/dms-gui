## BUGS:
* [ ] - Newly created account doesn't appear on the list immediately (requires manual refresh after a few seconds).
* [x] - Translations do not update immediately after language change (requires manual refresh).
* [x] 1.0.3 - Fails to show accounts when QUOTA is disabled
## TODO:
* [ ] - PORT_NODEJS: package.json .env webpack etc... use hard coded 3001
* [ ] - API: add index update command
* [ ] - Dashboard: there is no such thing as disk usage with docker
* [ ] - Dashboard: add index update command
* [ ] - Dashboard: add index section
* [ ] - Dashboard: getServerStatus disk usage not work
* [ ] - update compose lock to only access dms and no other containers
* [ ] - update emailValidChars based off what dms actually accepts
* [ ] - Upload my forked container to hub.docker.com
* [ ] - Implement shields.io badge
* [ ] - Implement functionality for the Settings page or remove it (currently mocked).
* [ ] - Should we rely on setup script or more simply read the files off dms directly?
* [x] 1.0.4 - upgrade to 24-alpine
* [x] 1.0.4 - show node and project version at start
* [x] 1.0.4 - find a way to get the version from package.json into /api/status
* [x] 1.0.3 - Add information for future contributors (e.g., contribution guidelines).
* [x] 1.0.3 - Fix account regex when QUOTA is enabled or not
* [x] 1.0.3 - Better debug logging
* [x] 1.0.3 - Variabilize SETUP_SCRIPT
