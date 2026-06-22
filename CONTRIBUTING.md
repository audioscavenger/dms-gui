This project is a GUI for DMS email server, just like the admin container of Mailu.

I work on this solo, until someone finds an interest in it.

This GUI relies on a simple python API to execute `system` and `setup` commands inside the DMS container. This architecture is modular enough, allowing to add other gui-less mail server projects in the future.

# Primary goals:

1. [x] kick start the project: **done**, thanks to dunajdev and Claude
2. [x] refactor, fix all the bugs, document and define scope: **done**
3. [x] ability to load/save/refresh data from json files or dms commands: **done**
4. [x] add rebuild/refresh xapian index buttons in Accounts page: **done**
5. [x] add a login page with JWT+session cookies **done**
6. [x] add a Profile page and ability to change mailbox passwords  **done**
7. [ ] add Domains+DNS+DKIM entries page
8. [ ] add Backup/Import menu entries and code
9. [ ] add DNS push/update entries with (dnscontrol)[https://github.com/StackExchange/dnscontrol]

# Extra goals:

10. [ ] add fail2ban management
11. [ ] add Rspamd link
12. [ ] add hack statistics


## BUGS:

* [ ] - frontend/LeftSidebar: LeftSidebar collapse button is too large
* [ ] - frontend/LeftSidebar: LeftSidebar is only as high as the window on first load, when you scroll down it's blank
* [-] - frontend/DataTable usePrevious to highlight data change on reload/change does not work anymore since we filter+sort data - I don't care
* [ ] - frontend/Settings: Node.insertBefore: Child to insert before is not a child of this node happens sometimes

## chores:

* [ ] - frontend: maybe npm install react-router-dom@latest axios@latest one day?
* [ ] - unify all frontend errors with {success:false, message, and unified error codes} **WIP**
* [x] - make a decision on how to update localStorage(user) when user's details are changed, do we log them out?
* [x] - chore/backend: test that we are indeed rejected when cookie is deleted, as I suspect /logout does not delete it
* [ ] - translation: there seems to be lots of messages unused throughout the project, clean them up
* [ ] - chore: there gotta be a way to embedd transforms in fields we push to the DB, such as always stringify roles etc

# TODO:

The **done** list versions is in reverse order, as you want to see the most recents firt.

The TODO list rank is in order, as you naturally read from top to bottom and therefore, the most difficult ones are at the top.

## backend
* [-] - backend: implement uuid for all id columns: NO BENEFITS. I never go there, ids are uniq and I trust the SQL queries, why change that?
* [ ] - implement roles table


## Design

### NavBar:
* [ ] - save user's lang in logins table?

### LeftMenu:
* [ ] - refactor LeftSidebar to be collapsible and extend main container
* [ ] - add entry to rspamd page when RSPAMD=1 just like Mailu
* [ ] - add entry to snappymail when said variable is detected
* [ ] - add entry to Backups page
* [ ] - add entry to Imports page

### Profile:

### Dashboard:
* [ ] - Display statistics like https://poste.io/
* [ ] - add statistics about hacking attempts
* [ ] - add statistics and actions for fail2ban, it's a bitch to handle with command line

### Domains:
* [ ] - implement grid checkbox actions
* [ ] - start with a DataTable page of domains and see where we go
* [ ] - add dkim modules and exec calls
* [ ] - add DNS entries mechanics
* [ ] - (dnscontrol)[https://github.com/StackExchange/dnscontrol] will do the work, but I need to factor the processes and store the various DNS credentials securely

  Domains page be like:
  * domain name
  * number of accounts and aliases ?
  * A status and modal button
  * MX status and modal button
  * dkim status and modal button
  * spf status and modal button
  * TLSA status and modal button
  * SRV status and modal button
  * TXT status and modal button
  * SpamHaus/am I blacklisted sort of status
  * DNS modal button: display 1 domain entries as table with push/pull all or individual entries

### Logins:
* [ ] - implement grid checkbox actions
* [ ] - should we prevent usernames made of digits only?

### Accounts:
* [ ] - implement grid checkbox actions
* [x] - do we keep auto create logins for each account? YES but then we should stop using REPLACE, and use INSERT OR IGNORE because of existing ones
* [x] - 1. always create logins for each detected account, but let admins disable them as they attach roles to some users
* [x] - 2. each account must have either a linked login, or a login with that role must exist: NO, they can live without a login
* [ ] - 3. each account should show when they are unmanaged or login-less
* [ ] - 4. how easy is it to detect if an account without linked login is in a role for another login?
* [ ] - backend: update emailValidChars based off what dms actually accepts: pretty sure "~" is not accepted
* [ ] - switch FTS/quota/etc detection from reading files to `dovecot -n reports` or `doveconf -P` command instead?
* [ ] - add folders resubscribe option somehow, which is needed after import anyways. That means mailbox folder management, yike
* [-] - 1. implement most commands from dms setup.sh in a similar way we do with doveadm(), naming it dmsSetup? name is execDMS and no not yet
* [-] - 2. update all execDMS calls in accounts/aliases - maybe one day when we implement Poste, to avoid duping all functions?
* [ ] - Add delete my account in Profile
* [ ] - 1. Implement queued commands?
* [ ] - 2. add a delay before issuing the mailbox delete command, show it greyed out with countdown in the table?
* [ ] - 3. add a delay before issuing the mailbox delete command, that the user can cancel at the frontend?

### Settings:
* [ ] - we should definitely conduct a first-time global scan after a mailserver entry is added

### Backups:
* [ ] - start working on mailbox backups

### Imports:
* [ ] - start working on mailbox imports, with 2 mbox formats: /domain/user like DMS vs /user@domain like Mailu

## build:
- [dms-gui](https://github.com/audioscavenger/dms-gui)
- [wiki](https://github.com/audioscavenger/dms-gui)
- [hub.docker](https://hub.docker.com/repositories/audioscavenger)

alias buildup='docker-compose down --volumes; docker-compose up --build --force-recreate'
alias buildup='docker-compose down --volumes; docker-compose build --no-cache; docker-compose up --force-recreate'   # if you need to redetect changes and purge all caches
run --rm --entrypoint ls audioscavenger/dms-gui:latest -la /app
<!--
drwxr-xr-x    1 root     root          4096 Apr 19 17:01 .
drwxr-xr-x    1 root     root          4096 Apr 19 17:01 ..
drwxr-xr-x    1 root     root          4096 Apr 19 16:31 backend
-rw-rw-r--    1 root     root         10262 Apr 14 18:36 common.mjs
drwxr-xr-x    1 root     root          4096 Apr 19 16:35 frontend
-rw-rw-r--    1 root     root            62 Apr 14 18:36 nodemon.json
-rwxrwxr-x    1 root     root           939 Apr 14 18:36 start.sh
-rw-r--r--    1 root     root             0 Apr 19 17:01 version.1.5.25
-->

docker login -u audioscavenger
<!-- we don't need to delete local releases anymore are they can only be pushed directly without cache, in multiarch -->
<!-- docker container prune -f && docker image prune -f && docker image rm audioscavenger/dms-gui:v1.5.4 -->
<!-- docker buildx build --no-cache -t audioscavenger/dms-gui:latest -t audioscavenger/dms-gui:$(grep "^ARG DMSGUI_VERSION=v" Dockerfile | cut -d= -f2) .
docker push audioscavenger/dms-gui --all-tags -->

<!-- https://medium.com/@life-is-short-so-enjoy-it/docker-how-to-build-and-push-multi-arch-docker-images-to-docker-hub-64dea4931df9 -->
docker buildx create          --name multiarch --node multiarch --platform linux/arm64/v8 --driver=docker-container ssh://root@oracle01:22
docker buildx create --append --name multiarch --node multiarch --platform linux/amd64          --driver=docker-container --bootstrap
docker buildx ls
<!-- NAME/NODE       DRIVER/ENDPOINT              STATUS    BUILDKIT   PLATFORMS
multiarch*      docker-container
 \_ multiarch    \_ ssh://root@oracle01:22   running   v0.25.1    linux/amd64*, linux/arm64, linux/arm (+2)
default         docker
 \_ default      \_ default                  running   v0.25.2    linux/amd64 (+3), linux/386 -->
docker container prune -f && docker image prune -f && docker builder prune -a -f
docker system df
docker buildx build --builder=multiarch --platform linux/amd64,linux/arm64/v8 -t audioscavenger/dms-gui:latest -t audioscavenger/dms-gui:$(grep "^ARG DMSGUI_VERSION=v" Dockerfile | cut -d= -f2) -f Dockerfile --push .


## history:

* [ ] v1.6.0 - before releasing 1.6.0, it should be made clear how to modify the compose of dms/dms-gui, the env files, and in which order
* [ ] 1.5.99 - update demo database
* [ ] 1.5.99 - retested: create/delete/update alias for admin/standard/isAccount
* [ ] 1.5.99 - retested: create/delete/update mailbox
* [ ] 1.5.99 - retested: create/delete/update login
* [ ] 1.5.99 - retested: create/delete/update mailserver

* [ ] 1.5.99 - index: we should remove updateDB from PATCH/logins and /accounts and create updateLogin and updateAccount modules
* [ ] 1.5.99 - saveServerEnvs and changePassword do not use scope and schema anymore, why?
* [ ] 1.5.99 - frontend: implement toasts, I am sick of those alerts that displace the UI elements

* [x] 1.5.70 - upgraded all packages to latest
* [x] 1.5.69 - bugfix: index: added 1mn delay before automated reboot or else the container reboots 60 times
* [x] 1.5.69 - frontend: Translate helper takes a 3rd argument: {error:message}
* [x] 1.5.69 - frontend: pages catch correctly forward API errors to the errorMessage: setErrorMessage and AlertMessage can take an object
* [x] 1.5.69 - bugfix: api correctly rejects with error message
* [x] 1.5.69 - bugfix: index was looking for req.body?.roles.length and fails when roles is missing
* [x] 1.5.68 - update DEMO database
* [x] 1.5.67 - bugfix: deleteEntry in sql
* [x] 1.5.67 - common: added array2ArrayOfObj
* [x] 1.5.67 - Accounts: added Autocomplete field just like for roles
* [x] 1.5.67 - index: correct use of resetTokens instead of injecting "null"
* [x] 1.5.67 - index: PATCH/login extracts roles and add them separately
* [x] 1.5.67 - sql: renamed refreshTokens to resetTokens
* [x] 1.5.67 - sql: bugfix in update.refreshToken
* [x] 1.5.67 - sql: select.accounts taps into roles to return an array of managers column
* [x] 1.5.67 - logins: add/remove/get logins update the roles table
* [x] 1.5.67 - BREAKING CHANGE: implement roles table
* [x] 1.5.67 - db: added length checks for CHECK(length(username) <= 36), email and mailbox(254)
* [x] 1.5.67 - backend: clear distinction between getRolesFromLogins and getRolesFromRoles
* [-] 1.5.66 - backend: implement uuid for all id columns: NO BENEFITS. I never go there, ids are uniq and I trust the SQL queries, why change that?
* [x] 1.5.66 - logins: what happens when 2 users have the same role? yes they can. It's by design I swear.
* [x] 1.5.66 - bugfix: Logins: cannot release AddLogin button: hasErrors = !!isNonEmptyDict(freshErrors); mailserverRequired, why? INIT starts with containerName
* [x] 1.5.66 - bugfix: standard users can see their mailboxes but storage usage is "N/A"; fixed: DataTable has better stringify/nullify selection
* [x] 1.5.65 - time to release?
* [x] 1.5.65 - bugfix: frontend: change password broke out of the blue: isNonEmptyDict(errors) with no errors is 0 == false which broke the form validations
* [x] 1.5.65 - update DEMO database
* [-] 1.5.65 - logins: shouldn't addLogin do the getLogin itself and take force=true to recreate it or smth? maybe. don't care enough.
* [x] 1.5.64 - frontend: mailserver/containerName selection dropdown in the branding
* [x] 1.5.64 - frontend: Content-Security-Policy warning was fixed in 1.5.63
* [x] 1.5.64 - frontend: internal nginx updated with map extension fixed all other unsupported protocol for sourcemap request etc
* [x] 1.5.63 - frontend: first load bombs with downloadable font: download failed (font-family: "bootstrap-icons" style:normal weight:400 stretch:100 src index:0): status=2152398850 source: https://dms.domain.com/92ea18a81d737146ff04.woff2?e34853135f9e39acf64315236852cd5a: updated webpack and internal nginx
* [x] 1.5.63 - common: added isNonEmptyDict everywhere
* [x] 1.5.63 - frontend: DataTable: sanitize passed data with stringify objects
* [x] 1.5.63 - settings: getNodeInfos: added ENV_MODE PORT_BACKEND BACKEND_PROXY_URL PORT_FRONTEND FRONTEND_PROXY_URL
* [x] 1.5.63 - bugfix: fixed with webpack --mode development: /login first load bombs: NotFoundError: Node.insertBefore: Child to insert before is not a child of this node bootstrap-autofill-overlay.js:1453:30
* [x] 1.5.63 - webpack: added clean=true
* [x] 1.5.63 - swag nginx: proxy_cookie_path / "/; Secure; HttpOnly; SameSite=strict";
* [x] 1.5.63 - Login: first login bombs: 4 Cookie warnings: The value of the attribute “path” for the cookie “accessToken|refreshToken” has been overwritten; awag nginx update to accept cookies in strict mode
* [x] 1.5.63 - webpack --mode development --devtool eval-source-map
* [x] 1.5.62 - webpack --mode development does indeed produce a dist folder
* [x] 1.5.62 - nginx.conf becomes a template with BACKEND_PROXY_URL and UPSTREAM_NGINX
* [x] 1.5.62 - bugfix: Dockerfile, webpack, development mode, trials and errors
* [x] 1.5.61 - bugfix: useAuth: missing isDEMO in the useMemo state, fixed logout routine
* [x] 1.5.61 - App: fixed routes and added Outlet, updated NavBar as well
* [x] 1.5.61 - api: fixed api.interceptors.response.use finally
* [x] 1.5.61 - index: refactored generateAccessToken and generateRefreshToken using strict rules for the payload
* [x] 1.5.61 - index: all res.status amd res.json not have a return, following industry's standards 
* [x] 1.5.61 - index: refactored cookies security and fixed /logout
* [-] 1.5.61 - Logins: implement cancel button in the table? we could easily, but a refresh is prefered.
* [x] 1.5.61 - frontend: /logout fails with uncaptured 401 when token is expired
* [x] 1.5.60 - api: refuse to let linked account users add regex aliases by themselves
* [x] 1.5.60 - performance: pullAccountsFromDMS, parseAliasesFromDMS, pluck, plucks
* [x] 1.5.60 - performance: convert array.includes to set.has
* [x] 1.5.60 - Logins: complete reset of fetchAll()
* [x] 1.5.60 - Logins/Profile/Accounts: display counter for username and mailbox
* [x] 1.5.60 - Logins: regexUsername is limited to 36 chars
* [x] 1.5.60 - common: regexUsername is limited to 36 chars
* [x] 1.5.60 - common: regexEmailStrict and regexFindEmailStrict have a limit of 254 chars; RFC 3696; RFC 2821
* [x] 1.5.60 - bugfix: typeof parseInt("") is NaN which is a "number"; pfffff fixed ALL integer checks everywhere
* [x] 1.5.60 - api: better error handling: api returns result.message instead of result.error to comply with try/catch
* [x] 1.5.60 - Accounts: deleteAccount modal should show an option to also delete the mailbox: alsoDeleteLogin
* [x] 1.5.60 - Logins: deleteLogin modal should show an option to also delete the mailbox: alsoDeleteMailbox
* [x] 1.5.60 - frontend: getLogin does not take guess=true anymore
* [x] 1.5.60 - logins: getLogin does not take guess=true anymore
* [x] 1.5.60 - logins: getLogin takes credentials=number/mailbox/username/object
* [x] 1.5.59 - Logins: deleting a login should show a modal
* [x] 1.5.59 - performance: Logins: deleteLogin should just remove the UI table entry instead of fetchLogins
* [x] 1.5.58 - Accounts: delete a linked account should also delete the login
* [x] 1.5.58 - bugfix: deleteAccount does not remove the mailbox from all user's roles in logins table; not trivial and unneeded: cleanRoles does the job
* [x] 1.5.58 - bugfix: Accounts show all mailboxes for standard user
* [x] 1.5.58 - bugfix: Aliases show all mailboxes in the dropdown for isAccount users; permission correctly denied when choosing destination != their mailbox
* [x] 1.5.58 - bugfix: getAccounts roles redux was not done on the dbAll query
* [x] 1.5.57 - translation: password.passwordUpdated takes 2 parameters: key and value
* [x] 1.5.57 - Profile: changing password for isAccount also updates the logins password
* [x] 1.5.57 - Logins: changing password for isAccount also updates the logins password
* [x] 1.5.56 - Logins: cleanRoles for getLogin/getLogins/getRoles removes missing mailboxes, this way whenever someone alter and saves that login, roles will be updated in db
* [x] 1.5.55 - Accounts: delete mailbox has a scary Modal
* [x] 1.5.55 - bugfix: Accounts create "Create a dms-gui login for that account?" cannot be unchecked
* [x] 1.5.54 - backend: updated urls and description of each doveadm command
* [x] 1.5.54 - accounts: addAccount check getLogin before doing addLogin
* [x] 1.5.54 - Accounts: recreate an account when the login for that mailbox still exist should not error out, should either do getLogin or kill the error; backend does it
* [x] 1.5.54 - Logins: refactored fetchAll
* [x] 1.5.54 - Accounts: refactored fetchAll
* [x] 1.5.54 - bugfix: Accounts: handleSubmitNewAccount triggers fetchAccounts(): we need a formated storage object and I want the getAccounts backend to do that; it's fast enough
* [x] 1.5.54 - bugfix: getAccounts properly filters accounts by roles passed; not used by any function yet
* [x] 1.5.54 - bugfix: fetchAccounts(true) calls getAccounts and calls addLogin blindly and they all fail since they already exist: getAccounts does getLogin first
* [x] 1.5.54 - Settings: pulls everything when submitting new DMS: done, by redirecting to /dashboard + isFirstRun=true in 1.5.4x - can't remember
* [x] 1.5.53 - common: reduxArrayOfObjByValue now takes invert=true to filter out the array
* [x] 1.5.53 - bugfix: Accounts: deleteAccount triggers fetchAccounts(true), why not just remove the UI table entry? yes do that
* [x] 1.5.52 - frontend api security: api.interceptors.request.use((config) => encode all urls because mailbox uas an @ so let's encode everything!
* [x] 1.5.52 - bugfix: index.js: app.delete('/api/accounts/:schema/containerName/:mailbox' was missing schema and a colon
* [x] 1.5.52 - Accounts: DELETE https://dms.domain.com/api/accounts/dms/dms/test@xyz.com 404: must encode mailbox; Express automatically decodes URL parameters
* [x] 1.5.51 - Logins: following this logic, we filter out the mailboxes from the dropdown that are already linked when isAccount checkbox is true
* [x] 1.5.51 - bugfix: Logins: what happens when you create a linked mailbox user while another one exist for the same mailbox? UNIQUE constraint failed: logins.whatever constraint
* [x] 1.5.50 - tested: a linked mailbox can indeed edit other mailboxes's aliases when they have the roles
* [x] 1.5.50 - feature: Logins page do reset the roles to only the user's mailbox when re-linking the mailbox in the DataTable; that allows a linked mailbox to handle aliases of other mailboxes!
* [x] 1.5.50 - bugfix: backend was missing getTargetDict
* [x] 1.5.49 - index.js: security: does not spit 401 anymore for loginUser as we cannot hide them at all from the console
* [x] 1.5.49 - Logins: we should hide the failed default login tentative from the console as it spits out an Axios 401 error
* [x] 1.5.49 - backend: moved doveadm() to backend
* [x] 1.5.49 - backend: renamed execSetup() to execDMS() to reflect it's for docker-mailserver only; later on we can add execPoste()
* [x] 1.5.48 - settings: rewrite yet again the initAPI mechanics
* [x] 1.5.48 - FormContainerAdd: rewrite yet again the initAPI mechanics
* [x] 1.5.48 - FormContainerAdd: test API button is the one that should send the uuid for testing, inject button should NOT save anything in the db at all
* [x] 1.5.48 - FormContainerAdd: dynamic buttons enablement by passing form errors to the validation function like in Profile and Logins
* [x] 1.5.48 - FormContainerAdd: when redirect to /settings with isFirstRun=true we should Alert "Please fill in the required fields: blah" -> firstRun is now useLocalStorage
* [x] 1.5.48 - FormContainerAdd: move Alerts on top
* [x] 1.5.48 - README: various updates throughout
* [x] 1.5.48 - Profile: when redirect to /profile with isFirstRun=true we should Alert "You should change your password" -> firstRun is now useLocalStorage
* [x] 1.5.47 - realization: the more I fix bugs the more I discover it's just the starting scope that was incomplete and lacked definitions.
* [x] 1.5.47 - realization: Also I'm alone to do that and the task is humongous, AND not a single person can think of everything from the start.
* [x] 1.5.47 - index.js: clear distinctions among 3 scenarios when updating a DMS account password
* [x] 1.5.47 - bugfix: Logins: changing password there for isAccount correctly changes the mailbox password just like in Profile
* [x] 1.5.47 - bugfix: Logins: make sure failure to change password from the modal does close the modal and error is displayed
* [x] 1.5.47 - bugfix: Profile: failure to change password from the modal does not close the modal but error is displayed
* [x] 1.5.47 - bugfix: Accounts: failure to change password from the modal does not close the modal and no error is displayed
* [x] 1.5.46 - Profile and Accounts correctly update isAccount/non-admin password in DMS
* [x] 1.5.46 - bugfix: Profile: was missing getValueFromArrayOfObj definition
* [x] 1.5.46 - backend: correctly display anonymizedCommand instead of command: we hide passwords
* [x] 1.5.46 - accounts: created updateAccount
* [x] 1.5.46 - db: changePassword simply calls updateAccount extra on top of dbRun: we change the password in both DMS and the local db
* [x] 1.5.46 - index.js: call updateDB for app.patch('/api/accounts/:schema/:containerName/:mailbox') based off conditions
* [x] 1.5.46 - accounts: updateAccount does not exist because it's done by db/changePassword called by updateDb: I don't think that's the correct way at all
* [x] 1.5.45 - logins: isAccount mailbox login now calls doveadm
* [x] 1.5.45 - backend: added results?.returncode in all return failures
* [x] 1.5.45 - bugfix: accounts: doveadm would not replace jsonDict when defaults are absent; added none: null when no defaults are needed
* [x] 1.5.45 - backend: move loginUser for accounts to accounts>doveadm function
* [x] 1.5.44 - backend: execInContainerAPI/addLogin/loginUser logs anonimized passwords with ********
* [x] 1.5.43 - bugfix: upon login useAuth navigates to /dashboard if mailserver and admin password is updated, /settings or /profile otherwise
* [x] 1.5.43 - bugfix: ServerInfos table does not show boolean values; it's fixed but i can't remember when
* [x] 1.5.42 - bugfix: dbUpgrade seems to execute twice
* [x] 1.5.41 - bugfix: FINALLY! frontend logger correctly shows clickable line numbers pointing to the exact files
* [x] 1.5.40 - bugfix: never run a blind npm audit fix on frontend anymore; since the uuid regression, it always bombs
* [x] 1.5.40 - bugfix: added to frontend: react-transition-group@4.4.5 --save-exact AND webpack-cli@latest webpack-dev-server@latest
* [x] 1.5.40 - bugfix: upgraded all packages to latest and frontend had to add overrides: "uuid": "^11.1.1"; removed as it breaks dependencies
* [x] 1.5.40 - bugfix: frontend randomely bombs with React does not recognize the `i18nIsDynamicList` prop on a DOM element. This bug was officially patched and resolved in react-i18next versions 17.0.4 and higher. Versions 17.0.8 fixed it!
* [x] 1.5.39 - bugfix: Dashboard: rebootMe simply logs you out; fixed by fixing /logout
* [x] 1.5.39 - bugfix: /logout now catches errors properly, hook and index.js updated along with api.mjs and logout doesn't flash the login screen twice anymore
* [x] 1.5.39 - bugfix: api.interceptors.response.use() now process error items properly + added ddebug delay() to show errors before page refresh
* [x] 1.5.39 - bugfix: logout produces axios API request aborted error with status code 401 / AxiosError: Request failed with status code 502: refactor api.mks with cacheWrap
* [x] 1.5.38 - backend: must find a way to delete the database on start: added environment DATABASE_RESET=true and clear message on start
* [x] 1.5.38 - bugfix: My Profile page refresh does not log user out after server restart: cannot reproduce
* [x] 1.5.37 - bugfix: My Profile page shows a 0 when the loginFormData.isAccount is false == always use double negation to make sure it's a boolean!
* [x] 1.5.37 - bugfix: My Profile should disable submit button until form is valid
* [x] 1.5.37 - bugfix: My Profile should show roles
* [x] 1.5.37 - bugfix: My Profile for non admin users should show username field disabled
* [x] 1.5.36 - Login: common.collapse translation was missing
* [x] 1.5.36 - Login: should now show the collapse button: collapsible={false} is the correct syntax
* [x] 1.5.35 - bugfix: new login mailbox field should indicate it can be used for login purposes but we should still require it
* [x] 1.5.35 - Logins: FINALLY, cannot overwrite existing users anymore when creating new logins and everything seems to work just fine
* [x] 1.5.35 - bugfix: Logins: favorite mailserver should be preselected under add login
* [x] 1.5.35 - bugfix: Logins: checkbox onChange was not detected as checkbox because we use Form.Check
* [x] 1.5.35 - bugfix: Logins: merged field and checkbox tests into handleNewLoginInputChange
* [x] 1.5.35 - bugfix: Logins: added missing mailserver in the list of loginFormErrors
* [x] 1.5.35 - bugfix: Logins: release of save login button is delayed yet again, must pass updatedFormData to validateNewLoginForm; this is annoying
* [x] 1.5.35 - bugfix: Logins: when isAccount, roles were pulling email value instead of mailbox
* [x] 1.5.35 - Logins: save login button should be disabled until form is valid
* [x] 1.5.35 - frontend: removed all of this strict/lax email nonsense
* [x] 1.5.34 - frontend: css sould add opacity:0.25 for all disabled buttons
* [x] 1.5.34 - bugfix: Logins: editedData was lost after saving one row, added synchronous editedData state passed through various functions
* [x] 1.5.34 - bugfix: Logins: table does not refresh after successful login update like change username or mailbox
* [x] 1.5.34 - bugfix: backend.sql: new admin login with existing mailbox email actually replaces existing admin's username: use INSERT instead of REPLACE
* [x] 1.5.33 - bugfix: Dashboard: on firstTime pull of container, logins and accounts cards show number of aliases
* [x] 1.5.33 - bugfix: backend did not always return error string upon failures, while UI only looks for error instead of message
* [x] 1.5.33 - bugfix: Logins doesn't show error messages
* [x] 1.5.33 - bugfix: updateDB always returned success
* [x] 1.5.32 - bugfix: delete the only one admin login shows "sql[logins].delete is missing [undefined]"
* [x] 1.5.32 - bugfix: Cannot deactivate/delete/demote the last admin, how will you administer dms-gui? message is not shown in the gui
* [x] 1.5.31 - bugfix: upon changing logged in user's userName or mailbox, log it out immediately upon success as the TLS token is now tempered
* [x] 1.5.30 - DataTable shows row in red text upon any modification
* [x] 1.5.29 - bug: DashboardCard values for accounts etc don't refresh when I call fetchAccounts etc; useLocalStorage has been upgraded but no luck
* [x] 1.5.29 - bugfix: useLocalStorage: updated setState to handle formatting differences and fixed state merging
* [x] 1.5.29 - bugfix: dismissible alerts are not dismissed when click on the cross
* [x] 1.5.29 - DashboardCard and DataTable: isLoading=true is the default
* [x] 1.5.29 - Dashboard: we should update each card on loading not the whole page: created a useState array for special cards
* [x] 1.5.29 - Settings: we should redirect user to dashboard after new container added successfully 100% as dashboard will load everything
* [x] 1.5.28 - Dashboard: useEffect force refresh of accounts and aliases when all counts are 0
* [x] 1.5.28 - Dashboard: added force refresh of accounts and aliases 
* [x] 1.5.28 - Dashboard/Aliases/Accounts: useLocalStorage for aliases and accounts
* [x] 1.5.28 - DashboardCard: added refresh and refreshTitle
* [x] 1.5.28 - Logins: turning to an admin should change the title of the change password modal; added translations
* [x] 1.5.28 - FormContainerAdd: Test API should turn green upon success or info upon any field change; added titles+translations
* [x] 1.5.28 - DEBUG: reset db and debug enabled
* [x] 1.5.27 - bugfix: updateDB "Error: sql argument must be a string: sql=" when reactivating a user; deactivate worked. Reason: any key check is 'undefined' but updateDB was looking for 'null'
* [x] 1.5.26 - bugfix: FormContainerAdd containerName change does not reset the invalid status once a it's valid; added setPingResult(false) in handlePingTest
* [x] 1.5.26 - bugfix: Aliases refresh button is not on the far left: Card titles not have a dive for all right-side buttons
* [x] 1.5.26 - bugfix: Accounts refresh button is behind the .alert-dismissible: added margin-right +50px
* [x] 1.5.25 - <!> left frontend.mjs and package.json in development mode
* [x] 1.5.25 - dbInit and dbUpgrade are not async anymore
* [x] 1.5.25 - re-added nodemon
* [x] 1.5.25 - upgraded all modules
* [x] 1.5.24 - retested: create/delete mailbox
* [x] 1.5.24 - retested: create/delete alias
* [x] 1.5.24 - proper use of Nullish Coalescing instead of logical OR || where it matters
* [x] 1.5.23 - frontend: Profile correctly use defaultChecked instead of isChecked for unmonitored checkboxes
* [x] 1.5.23 - frontend: components: safely convert booleans to true booleans for react components with bool = !!passedVariable
* [x] 1.5.23 - let admin use unsecure passwords, that's their problem
* [x] 1.5.22 - everything seems to work again
* [x] 1.5.22 - frontend: FormContainerAdd injects the API at the right time and not a dozen times
* [x] 1.5.22 - backend: saveSettings should not do anything else like injecting the API. One function, one job
* [x] 1.5.22 - frontend: bugfix: FormContainerAdd page refresh does not ping and therefore test API button is locked
* [x] 1.5.22 - frontend: FormContainerAdd correctly works again and redirects to dashboard if API is running
* [x] 1.5.22 - backend: correctly handle API port errors
* [x] 1.5.22 - must autoping and show as red or green to unlock the test API button; decision is made to not let user save a container that doesn't exist
* [x] 1.5.21 - fixed many error messages and retested pulling accounts and aliases and all seems to work again
* [x] 1.5.21 - containerName being used as a default value for some select, should not be defaulted to null
* [x] 1.5.21 - massing revamp of all functions with default values and more testing
* [x] 1.5.21 - undefined not being a valid JSON value, replaced by null everywhere
* [x] 1.5.21 - SSR Awareness + Cross-Tab Syncing: complete rewrite of useLocalStorage with useSyncExternalStore to replace useState and useEffect in pages
* [x] 1.5.21 - bug: LeftSidebar will not update links after we set containerName, despite all my efforts: solution is rewrite useLocalStorage
* [x] 1.5.20 - bug: LeftSidebar will not update links after we set containerName, why??
* [x] 1.5.20 - LeftSidebar will not let user go anywhere until containerName is set
* [x] 1.5.20 - index now gives AES_SECRET example value when needed
* [x] 1.5.20 - env does not blow anymore when AES_SECRET is missing
* [x] 1.5.20 - updated README and other documentation
* [x] 1.5.20 - upgraded all node_modules
* [x] 1.5.19 - updated README and other documentation
* [x] 1.5.19 - rest-api.py DMSGUI_VERSION dynamically set during creation of the file
* [x] 1.5.19 - rest-api.py now accepts DMS_API_HOST, DMS_API_SIZE and DEBUG from ebvironment
* [x] 1.5.19 - bugfix in res-api.py leading to HTTP 500
* [x] 1.5.19 - renamed user-patches-api to rest-api
* [x] 1.5.19 - bugfix in postJsonToApi that returns nothing when API key is absent in container
* [x] 1.5.19 - FormContainerAdd preselect favorite when user has no favorite
* [x] 1.5.18 - bugfix in getServerEnv
* [x] 1.5.18 - bugfix getServerEnvs calling getServerEnv with wrong arguments
* [x] 1.5.18 - bugfix LoadingSpinner in Settings and Accounts
* [x] 1.5.17 - everything seems to work again except Accounts shows error "name is required", where does that come from? 
* [x] 1.5.17 - frontend: FormContainerAdd only enables save button if API test is successful
* [x] 1.5.17 - done: initAPI
* [x] 1.5.16 - bug: aliases seem not pulled automatically
* [x] 1.5.16 - bug: envs seem not auto pulled upon saving dms
* [x] 1.5.16 - bug: Accounts pulled and creates logins but shows error "name is required", where does that come from?
* [x] 1.5.16 - done: getConfigs
* [x] 1.5.16 - done: getSettings getSetting
* [x] 1.5.16 - done: getServerStatus getServerEnvs getServerEnv
* [x] 1.5.16 - done: pullServerEnvs pullDOVECOT pullDoveConf pullDkimRspamd
* [x] 1.5.15 - done: deleteAlias
* [x] 1.5.15 - done: addAlias
* [x] 1.5.15 - done: getAliases
* [x] 1.5.15 - done: getAccounts
* [x] 1.5.15 - done: dbInit
* [x] 1.5.15 - done: getTargetdict
* [x] 1.5.15 - done: logins
* [x] 1.5.14 - done: getConfigs
* [x] 1.5.14 - BREAKING CHANGE: must delete db
* [x] 1.5.14 - frontend: bugfix in Profile: Invalid DOM property `class`. Did you mean `className`?
* [x] 1.5.13 - backend: updated all accounts and aliases functions everywhere with schema
* [x] 1.5.13 - frontend: bugfixes in Logins
* [x] 1.5.13 - frontend: bugfixes in all updateLogin and deleteLogin now using id
* [x] 1.5.13 - backend: correctly implement getTargetdict
* [x] 1.5.13 - backend: correctly implement childProcess.exec()
* [x] 1.5.13 - backend: dbInit test if table exist instead of blindly recreating it
* [x] 1.5.13 - frontend: FormContainerAdd also offers to set new mailserver as favorite when user.mailserver is unset
* [x] 1.5.13 - frontend: Login also fetchMailservers and setMailservers
* [x] 1.5.13 - frontend: new state called mailservers = [ {value:containerName', plugin:'mailserver', schema:'dms', scope:'dms-gui'}, ..]
* [x] 1.5.13 - backend/db: renamed logins.favorite to mailserver
* [x] 1.5.12 - frontend: numerous fixes in FormContainerAdd
* [x] 1.5.12 - backend: getServerStatus and getTargetDict accept [settings] for testing API without existing mailservers in db
* [x] 1.5.12 - backend: now pushing errors into error instead of message
* [x] 1.5.12 - frontend: now pulling errors from result?.error
* [x] 1.5.12 - logins key is now id
* [x] 1.5.12 - BREAKING CHANGE: test db table rebuild
* [x] 1.5.11 - schema='dms' is still had-coded at some places but we are getting there
* [x] 1.5.11 - BREAKING CHANGE: added timeout to mailserver/dms settings
* [x] 1.5.10 - BREAKING CHANGE: rewrite all settings functions: saveServerEnvs, getServerEnvs, getServerEnv, saveServerEnvs, getSettings, getSetting, getScopes->getConfigs, saveSettings
* [x] 1.5.10 - design decision: dnsProvider is a per domain thing, and should be attached in domains table, not settings
* [x] 1.5.10 - design decision: DNS will be handled by `ghcr.io/stackexchange/dnscontrol` with cherry on the cake, it relies on JS config files
* [x] 1.5.10 - research [DNS entries mechanics](https://github.com/StackExchange/dnscontrol)
* [x] 1.5.10 - research [DNSConfig](https://pkg.go.dev/github.com/StackExchange/dnscontrol/models#DNSConfig)
* [x] 1.5.10 - research [DLS language](https://docs.dnscontrol.org/language-reference/domain-modifiers/tlsa)
* [x] 1.5.10 - research [Supported providers](https://docs.dnscontrol.org/provider/index)
* [x] 1.5.10 - research [Cloudflare](https://docs.dnscontrol.org/provider/cloudflareapi)
* [x] 1.5.10 - renamed killMe as killContainer
* [x] 1.5.10 - updated all @swagger definitions
* [x] 1.5.9 - BREAKING CHANGE: renamed provider to dnsProvider in domains table == drop the table
* [x] 1.5.9 - BREAKING CHANGE: DB_VERSION has its own plugin and schema, updated dbUpgrade()
* [x] 1.5.9 - BREAKING CHANGE: all DB_VERSION instert and update are updated in sql
* [x] 1.5.9 - BREAKING CHANGE: settings table has scope->configID + added new table config with scope: user or dms-gui
* [x] 1.5.8 - added encrypt and decrypt functions, with matching new variables in .dms-gui.env.example
* [x] v1.5.7 - bugfix in Settings: cannot change DMS
* [x] v1.5.6 - bugfix release
* [x] 1.5.5 - introduce LOG_COLORS to disable backend log colors
* [x] 1.5.5 - frontend/Login: bugfix: we force logout users when they access /login otherwise they would be partially logged out when refresh keys regenerate
* [x] 1.5.5 - backend: bugfixes initAPI dbGet and createAPIfiles
* [x] 1.5.5 - Navbar isDEMO shows hub.docker download button
* [x] 1.5.5 - Navbar isDEMO shows reboot countdown
* [x] v1.5.4 - release multi-arch x86_64 (amd64) + aarch64 (arm64)
* [x] v1.5.3 - release
* [x] 1.5.2 - bugfix in docker-compose example
* [x] 1.5.2 - bugfix in frontend
* [x] 1.5.2 - bugfix in deleteAlias and getAliases
* [x] 1.5.2 - bugfix in deleteEntry
* [x] 1.5.2 - added demo data as dms-gui-demo.sqlite3 and new variable `DEMO=true` that uses dms-gui-demo-live.sqlite3 reset when container restarts
* [x] 1.5.1 - minor README updates
* [x] v1.5.0 - release
* [x] 1.4.9 - backend: a ton of bugfixes
* [x] 1.4.9 - backend/accounts: bugfix: added -y to delete account as command would stall otherwise
* [x] 1.4.9 - backend/accounts: delete account also delete all aliases
* [x] 1.4.9 - frontend: users can finally add their own aliases
* [x] 1.4.9 - backend: bugfix: changePassword was hard coded as "password".... silly mistake
* [x] 1.4.9 - backend: account changePassword actually changes dovecot password
* [x] 1.4.9 - linked mailbox users now login with dovecot only
* [x] 1.4.9 - linked mailbox users can now change their mailbox password
* [x] 1.4.9 - frontend: non admins have a warning that changing mailbox password is under Accounts
* [x] 1.4.9 - frontend: non admins have access to Accounts but not isAccount users
* [x] 1.4.9 - frontend: bugfix with all those 0 when !user.isAdmin
* [x] 1.4.9 - security: some calls for non admins fail silently instead of spitting a 403
* [x] 1.4.9 - logout actually works now, window.location.replace() instead of navigate
* [x] 1.4.9 - getScopes now takes roles to spit out only containers associated with roles
* [x] 1.4.8 - upgraded all modules
* [x] 1.4.8 - frontend/Settings: introduce restart dms-gui button and added killMe(errorcode)
* [x] 1.4.8 - introduce DMSGUI_CRON=`* 1 23 * * *` to alter the daily container restart set at 11PM
* [x] 1.4.8 - npm install --save node-cron
* [x] 1.4.7 - security: backend actually checks for user roles and whatnot
* [x] 1.4.7 - added refreshToken column to logins table
* [x] 1.4.7 - Okay I gave up asking questions no one answers on discord and stack, and used Claude to help me craft the jwt token tests and error handling
* [x] 1.4.7 - Accounts now show associated login usernames based off logins.mailbox match; itshould be roles, really
* [x] 1.4.7 - npm add cookie-parser express-jwt - npm remove axios
* [x] 1.4.7 - frontend/Logins: disable sorting for roles, it crashes and I refuse to deal with that
* [x] 1.4.6 - Increase CORS security
* [x] 1.4.6 - clear distinction between external email address, mailbox (to login as) and linked mailboxes
* [x] 1.4.6 - db update: we must save favorite container in each user login or bad shit happens on the frontend: db, logins, and addLogin, Login pages
* [x] 1.4.6 - frontend/Logins: bugfix: mailboxes list would not load because containerName is unset => fix logins db again
* [x] 1.4.5 - frontend/Settings: bugfix: choosing a containerName now fetch settings
* [x] 1.4.5 - db update: logins now have an external email field for password recovery
* [x] v1.4.4 - release
* [x] 1.4.3 - translation: updated bunch of related messages
* [x] 1.4.3 - frontend/Dashboard: updated the new bunch of status codes
* [x] 1.4.3 - frontend/Settings: add API test to setupPath field entry
* [x] 1.4.3 - frontend/Settings: add ping test to dms field entry
* [x] 1.4.3 - backend/settings: saveSettings correctly calls initAPI when all settings are saved properly and all valid
* [x] 1.4.3 - backend/settings: getServerStatus now clearly shows the actual error: dns down, ping down, API key missing, not gen, mismatch or unset, etc
* [x] 1.4.3 - backend/settings: transmit ping error to Dashboard
* [x] 1.4.3 - backend: added checkPort test to dms
* [x] 1.4.3 - backend: added ping test to dms
* [x] v1.4.2 - release
* [x] 1.4.1 - backend/account: bugfix in addLogin, roles must be stringified
* [x] 1.4.1 - frontend/Profile: cannot update user's email or username anymore, or it works every other time, solution: disable this ability
* [x] 1.4.1 - proper README update and next time, think of disabling debug mode before release, damn it
* [x] 1.4.1 - bugfixes
* [x] v1.4.0 - release
* [x] 1.3.4 - a gazillion bugfixes since we switched all calls to the new json form {success:true, message:result}
* [x] 1.3.4 - ALL files have been renamed properly for what they are: js, jsx, mjs and cjs
* [x] 1.3.4 - backend: bugfix in loading initAPI where API key would be always regenerated: removed call from index
* [x] 1.3.4 - backend: scope or containerName is now coming from the frontend and all backend environment variables suppressed, that's incompatible with React anyways
* [x] 1.3.4 - backend: all execCommand calls use const command, next step is to factor and name all those commands into env.js
* [x] 1.3.4 - backend: targetDict is now generated by db.js and used across all functions calling execCommand and execDMS
* [x] 1.3.4 - backend: execInContainerAPI now needs a dict with protocol, host, port, and also Authorization key
* [x] 1.3.4 - frontend/ServerInfo: removed container selection
* [x] 1.3.4 - because settings are now scoped, scope can also be a login id as we want to save user's preferences
* [x] 1.3.4 - frontend/formContainerAdd: added protocol, DMS_API_PORT
* [x] 1.3.4 - frontend/formContainerAdd: because settings are now scoped, we had to add getScopes API
* [x] 1.3.4 - frontend/Settings: merged container selection from ServerInfos into FormContainerAdd
* [x] 1.3.4 - frontend: scope/containerName/API_KEY/API_PORT are now coming from the frontend
* [x] 1.3.4 - backend: scope/containerName/API_KEY/API_PORT are and all backend environment variables suppressed, that's incompatible with React
* [x] 1.3.3 - env.js: creation of 3 large dictionaries as global variables
* [x] 1.3.3 - env.js: use of global variables in js ES6 is discouragead, lots transfered to .dms-gui.env
* [x] 1.3.3 - common.js: moved away from barrel files and each module import their own stuff
* [x] 1.3.3 - conversion of everything to ES6 modules for imports
* [x] 1.3.3 - backend: bugfix in common.js as arrow functions are not forgiving
* [x] 1.3.3 - backend: bugfix in python api
* [x] 1.3.3 - chore/frontend: convert all exported functions to arrows
* [x] 1.3.3 - chore/frontend: cleanup all unused imports
* [x] 1.3.3 - chore/frontend: rename all React components to jsx
* [x] 1.3.3 - complete revamp of ALL API communications: everything is now Object{success: true, message:whatever}
* [x] 1.3.3 - bugfixes here and there
* [x] 1.3.3 - backend: complete revamp of all parameters for all DMS functions
* [x] 1.3.3 - frontend/Profile: logout user if they changed their email and email in Logins page
* [x] 1.3.3 - frontend: cleaned up all catch errors removing error.response.data.error
* [x] 1.3.2 - backend: tried accessToken+localStorage, now switched to HTTP-Only cookie, but still use localStorage for user roles etc
* [x] 1.3.2 - docker/start.sh: implement random JWT_SECRET generation on start of container
* [x] 1.3.2 - backend/index: implement JWT token
* [x] 1.3.2 - frontend: npm add jwt-decode
* [x] 1.3.2 - backend: npm add jsonwebtoken
* [x] 1.3.2 - frontend/LeftSidebar: hide items and prevent access based off permissions
* [x] 1.3.1 - frontend/Profile: added Profile page! it only changes the password for dms-gui atm
* [x] 1.3.1 - frontend/components: added ButtonDropdown
* [x] 1.3.1 - backend/settings: bugfix in pullDoveConf()
* [x] v1.3.0 - release
* [x] 1.2.8 - backend/settings: pullServerEnvs() now rely on API and pullDoveConf()
* [x] 1.2.7 - backend/settings: disk usage is total of all mailboxes in MB
* [x] 1.2.7 - backend/settings: getServerStatus is now based off top command + top_parser.js
* [x] 1.2.7 - README: updated paths, ports, environment and columes requirements for the new DMS API access
* [x] 1.2.7 - dms-gui-api: added python logger to match dms time format 2025-11-05T15:05:49.710284+00:00 mx dms-gui-api:
* [x] 1.2.6 - backend/settings: rewrite getServerStatus() for API and integrate top_parser.js
* [x] 1.2.6 - backend: added Bearer token read from Authorization header in user-patches-api.py, instead of the body
* [x] 1.2.5 - backend: added execInContainerAPI() and postJsonToApi() and all seems to work escept 
* [x] 1.2.5 - backend/settings: initAPI() now creates both the user-patches-api.sh and user-patches-api.py, only when DMS_API_KEY exist and loaded
* [x] 1.2.5 - frontend/FormField: now embedds InputGroup and children
* [x] 1.2.5 - frontend/Settings: added DMS selector
* [x] 1.2.5 - frontend/Settings: added DMS_API_KEY field
* [x] 1.2.5 - backend/db: added initAPI() to generate new DMS_API_KEY and store it
* [x] 1.2.4 - bugfixes
* [x] 1.2.4 - BREAKING CHANGE: all db tables except domains now has id autoincrement as primary key
* [x] 1.2.4 - frontend.js: bugfix in warnLog
* [x] 1.2.4 - backend: properly initialize critical values like DMS_CONTAINER and such
* [x] v1.2.3 - release
* [x] 1.2.2 - backend: more bugfixes
* [x] 1.2.2 - frontend/Accounts: addAccount: enable create login by default
* [x] 1.2.2 - backend/db: bugfix in count queries
* [x] 1.2.1 - chore: refactoring and bugfixes, all seems to work
* [x] 1.2.1 - backend/db: refactor ALL scoped queries by always adding scopedValues to queries, so much simpler and failproof
* [x] 1.2.1 - backend/db: refactor ALL deleteSmth into deleteEntry
* [x] 1.2.1 - backend/frontend: refactor ALL the execDMS API calls to handle result.success and result.message instead of throwing error 500
* [x] 1.2.1 - backend/frontend: refactor ALL the execCommand API calls to handle result.success and result.message instead of throwing error 500
* [x] 1.2.1 - backend/frontend: refactor ALL the dbRun API calls to handle result.success and result.message instead of throwing error 500
* [x] v1.2.0 - release cancelled
* [x] 1.1.15 - backend/db: bugfix: changePassword had a reference to username
* [x] 1.1.15 - frontend/Accounts: add checkbox to not create a login for that new account
* [x] 1.1.15 - frontend/Logins: revamp addLogin page with isAdmin/isActive/isAccount and mailbox selection
* [x] 1.1.15 - frontend/Logins: disable isAccount option when isAdmin and also in backend/db
* [x] 1.1.14 - frontend/Logins: disable roles picking when login isAccount
* [x] 1.1.14 - frontend/Logins: disable save button when there are no changes
* [x] 1.1.14 - frontend/Logins: revamped changes detection and state
* [x] 1.1.14 - frontend/Logins: refactor ALL the updateLogin API call to handle result.success and message instead of throwing error 500
* [x] 1.1.14 - backend/db: allow to change a login's email only if isAdmin or not isAccount
* [x] 1.1.14 - backend/settings: bugfix: pullServerEnvs() was missing an await
* [x] 1.1.14 - backend/settings: added pullDOVECOT() to get dovecot version
* [x] 1.1.14 - backend/accounts: auto-create ALL missing accounts in logins db upon pull/refresh/addAccount
* [x] 1.1.14 - frontend/Logins: reflect change in email being primary
* [x] 1.1.14 - BREAKING CHANGE: db logins.email is now the primary key and added isAccount to signify it's linked to a mailbox
* [x] 1.1.14 - frontend/Logins: email is now mandatory as we switch to email-centric logins
* [x] 1.1.14 - frontend/Logins: highlight roles' selections for domains the email login is matching rolesAvailable
* [x] 1.1.13 - backend/db: presort accounts by domain and mailbox, this way the Autocomplete selector in Logins is perfect with no extra step
* [x] 1.1.13 - frontend/Logins: back to simple sorted array of strings for options, and groupBy is handled on the fly. So much easier
* [x] 1.1.13 - frontend/Logins: now useState of role objects because of groupBy, lost of complexity for no reason
* [x] 1.1.13 - common: created reduxArrayOfObjByValue
* [x] 1.1.13 - frontend: cosmetics around refresh button, filter control width when invisible
* [x] 1.1.12 - backend/settings: reindexAccount() becomes doveadm() with a complete set of commands and messages etc
* [x] 1.1.11 - backend/db: added dbCount and getCount api
* [x] 1.1.11 - frontend/DashboardCard: navigate instead of href
* [x] 1.1.11 - backend/db: refuse to deactivate the last admin
* [x] 1.1.11 - backend/db: refuse to demote the last admin
* [x] 1.1.11 - backend/db: updateDB test and check before updating values based off tests in sql object!
* [x] 1.1.11 - frontend/DataTable: now accepts column.noSort and column.noFilter
* [x] 1.1.11 - frontend/DataTable: bugfix: filter crashed when typing inexistent values
* [x] 1.1.11 - frontend/DashboardCards: added link param so you can click them
* [x] 1.1.11 - frontend/Dashboard: also show logins
* [x] 1.1.10 - backend: massive refactoring of updateLogin and updateAccount into db as updateDB
* [x] 1.1.10 - backend/logins: properly updateLogin
* [x] 1.1.10 - frontend/Logins: updated roles for each login are correctly pushed to updateLogin and correctly pulled from getLogins
* [x] 1.1.9 - BREAKING CHANGE: db accounts.email becomes accounts.mailbox
* [x] 1.1.8 - frontend/Logins: handling of roles with Autocomplete, and shenanigans to parse/stringify roles array in logins
* [x] 1.1.8 - frontend/Logins: handling of roles with Autocomplete, and shenanigans to parse/stringify roles array in logins
* [x] 1.1.8 - backend/db: roles table is the correct way, but heck lot of a work, let's store roles as stringified json in logins instead
* [x] 1.1.8 - frontend: added getRoles
* [x] 1.1.8 - backend: added getRoles
* [x] 1.1.8 - backend/settings: propagated new execCommand output syntax
* [x] 1.1.8 - frontend: added @mui/material @emotion/react @emotion/styled
* [x] 1.1.8 - backend/logins: prevents inactive logins from login
* [x] 1.1.7 - frontend/DataTable: bugfix: sorting rendered columns is possible when hidden data is added inside a span
* [x] 1.1.7 - frontend/DataTable: bugfix: fixed arrows not flipping on first click by removing !(column.key in sortOrders)
* [x] 1.1.7 - frontend/DataTable: bugfix: hide sort arrows for rendered columns with no data
* [x] 1.1.7 - frontend/Accounts: fixed storage object not showing anymore: split account.insert into 2 queries so storage data is not deleted
* [x] 1.1.7 - frontend/DataTable: now wraps text inside P tag to get row color and avoid coloring buttons inside a td
* [x] 1.1.6 - frontend/Logins: all seems to work, and isAdmin isActive flip switches too
* [x] 1.1.6 - frontend: changePasswordLogin and changePasswordAccount have become updateLogin and updateAccount
* [x] 1.1.6 - backend/logins: prevent deleting the last admin in db
* [x] 1.1.6 - backend/db: added sql sorted by isActive
* [x] 1.1.6 - backend/db: added roles table
* [x] 1.1.5 - backend: renamed saveLogin to addLogin, same mechanics as accounts
* [x] 1.1.5 - frontend/translation: merged all password related fields into password group
* [x] 1.1.5 - backend/logins: created deleteLogin and changePasswordLogin
* [x] 1.1.5 - frontend/Logins: created login page from Accounts page
* [x] 1.1.4 - backend/aliases: handle virtual regex; add and delete all works + postfix reload
* [x] 1.1.4 - frontend/LanguageSwitcher: mapped available languages + enabled nonExplicitSupportedLngs + supportedLngs
* [x] 1.1.4 - frontend/Translate: replaces t(useTranslation) entirely
* [x] 1.1.4 - frontend/DataTable: now look for text-color column
* [x] 1.1.4 - frontend/Aliases: handle virtual regex
* [x] 1.1.4 - backend: added sql for aliases
* [x] 1.1.3 - backend: docker.getContainer is also in global.containers{}
* [x] 1.1.3 - backend: containerName calls global.DMS_CONTAINER
* [x] 1.1.3 - backend/db: added scope=dmsContainer in domains and accounts
* [x] 1.1.2 - backend/db: dbRun dbAll and dbGet now take ...anonParams
* [x] 1.1.2 - backend/frontend: implemented getServerEnv
* [x] 1.1.2 - backend/settings: pullServerEnvs purge the table before reloading
* [x] 1.1.2 - backend: detect FTS via dovecot command `doveconf mail_plugins`
* [x] 1.1.2 - frontend: added getDomains
* [x] 1.1.2 - backend: added getDomain and getDomains to API and backend
* [x] 1.1.2 - backend/db: table domains now includes dkim parameters: keytype keysize
* [x] 1.1.2 - backend/env: added defaults keytype keysize and defaunt path in table domains
* [x] 1.1.2 - backend/settings: now extract dkim parameters from existing fileName
* [x] 1.1.1 - Dockerfile: back to `npm ci` only
* [x] 1.1.1 - backend/env: renamed CONFIG_PATH as DMSGUI_CONFIG_PATH and added DMS_CONFIG_PATH and added DKIM_SELECTOR_DEFAULT
* [x] 1.1.1 - frontend/Accounts: handle accounts as array of named objects
* [x] 1.1.1 - backend/accounts: refactored getAccounts into array of named objects that include the domain
* [x] 1.1.1 - backend/accounts: append accounts table and save storage as stringified json
* [x] 1.1.1 - backend/db: added tables accounts and domains + moved hashPassword and verifyPassword in there
* [x] 1.1.1 - backend/pullServerEnvs: pulls dkim values if ENABLE_RSPAMD=1 and REPLACE {domain,dkim} in domains table
* [x] 1.1.1 - move backend.js and frontend.js to respective folders
* [x] v1.1.0 - release
* [x] 1.0.21 - frontend/Login: shows welcome message with default admin user when db is empty
* [x] 1.0.21 - translation: now accepts some html tags
* [x] 1.0.21 - translation: now accepts some html tags
* [x] 1.0.21 - frontend/useAuth: login/logout accept "to" destination
* [x] 1.0.21 - backend/db: init logins with default admin user or no one can login lol
* [x] 1.0.21 - frontend/Login: fixed login box messages
* [x] 1.1.0 - release cancelled
* [x] 1.0.20 - backend/settings: numbers from pullServerEnvs are saved as float in the db: CAST(@value AS TEXT) does not work, obj2ArrayOfObj now can stringify values
* [x] 1.0.20 - backend/settings: pullServerEnvs and saveServerEnvs take containerName as parameter
* [x] 1.0.20 - backend: fix in logger when appending end color
* [x] 1.0.20 - Dashboard does not show container usage anymore: resources{} names have changed somehow; defered cpu/mem conversion to Dashboard
* [x] 1.0.19 - loginPage and loginUser implemented!
* [x] 1.0.19 - logout button in NavBar
* [x] 1.0.19 - frontend/App: add auth loginPage
* [x] 1.0.18 - ALL WORKS, we should release
* [x] 1.0.18 - backend/db: dbRun now takes anonParam as well as arrays for INSERT queries
* [x] 1.0.18 - backend: added getSetting and updated getSettings api with query
* [x] 1.0.18 - frontend: fixed Accounts.js and ServerInfos.jsx to use new getNodeInfos and getServerEnvs
* [x] 1.0.18 - backend/api: getNodeInfos is simplified and created getServerEnvs
* [x] 1.0.17 - backend: added sql for infos: it's in settings table with scope = DMS name
* [x] 1.0.17 - backend: added sql for infos
* [x] 1.0.17 - backend/api: getSettings/saveSettings uses json array of objects
* [x] 1.0.17 - backend/db: patches are array of lines instead of BEGIN TRANSACTION so we can check each line
* [x] 1.0.17 - backend: added 2 columns to settings and merged with infos
* [x] 1.0.17 - backend: moved internals DB_VERSION_table to settings
* [x] 1.0.16 - frontend/Card: Placeholder Card to be created once we need it
* [x] 1.0.16 - frontend/Card: Extra spinner when isLoading in titleExtra
* [x] 1.0.16 - frontend/Dashboard: DashboardCards load individually
* [x] 1.0.15 - frontend/api: translation being impossible for some reason, we now only fw the backend messages
* [x] 1.0.15 - frontend/api: impossible to add translation because TypeError: react_i18next__WEBPACK_IMPORTED_MODULE_2__["default"] is not a function
* [x] 1.0.15 - frontend.js: impossible to add translation to logger because Invalid hook call
* [x] 1.0.15 - common.js now only contains portable functions
* [x] 1.0.15 - backend: YET AGAIN... js refuses to offer a caller id stack == custom logger with stack hack
* [x] 1.0.15 - had to REdevelop logger() with colors, YET AGAIN
* [x] 1.0.15 - backend/db: init the db on start
* [x] 1.0.15 - backend/db: automated patch upgrade of db
* [x] 1.0.15 - backend/db: proper error handling for dbOpen, dbRun, dbGet, dbAll, dbInit, dbUpgrade
* [x] 1.0.15 - backend/env: handle versions with a "v" and keep only the numbers
* [x] 1.0.15 - frontend/Settings/logins: test getLogins, addLogin
* [x] 1.0.15 - frontend/Settings/logins: do not bring password back in as they are salted
* [x] 1.0.14 - backend/logins: encrypt password in db.logins.json
* [x] 1.0.14 - frontend/Button: add a link to parameters
* [x] 1.0.14 - frontend/Settings/logins: test getLogins
* [x] 1.0.14 - frontend/Settings: now an Accordion as we will have to deal with many parts
* [x] 1.0.14 - frontend/pages: bugfix with booleans passed to components
* [x] 1.0.13 - moved all env global variables into env.js
* [x] 1.0.13 - split all common functions into /app/common/backend.js and frontend.js
* [x] 1.0.13 - backend/logins: implemented dbGet, dbAll, dbRun, save, get, verifyPassword, hashPassword
* [x] 1.0.13 - backend: implemented better-sqlite3 and sql for settings and logins
* [x] 1.0.13 - Dockerfile: switched all base images to node:24-alpine as slim is incompatible with better-sqlite3
* [x] 1.0.13 - backend: implement sqlite3; wasted 20mn of my life, moving on.
* [x] 1.0.12 - frontend/Sidebar: .leftsidebar inline-flex is the solution for collapse but then impossible to place the button properly
* [x] 1.0.12 - frontend/Aliases: add LeftSidebar collapse button
* [x] 1.0.12 - frontend/Aliases: renamed Sidebar to LeftSidebar
* [x] 1.0.11 - frontend/CardFormContainerAdd: pops an error saying A component is changing an uncontrolled input to be controlled: fixed by testing data properly when isLoading
* [x] 1.0.11 - backend/getSmth: bugfix yet again when db is empty or missing data: no refresh would ever take place
* [x] 1.0.11 - frontend/Accounts: add refresh icon to Accordion
* [x] 1.0.10 - BUG: since sorting and filtering is added, change highlighting does not happen anymore
* [x] 1.0.10 - BUG: find a way to hide the arrows for object columns with no data
* [x] 1.0.10 - frontend/DataTable: handle filtering for rendered object columns like we do for sorting
* [x] 1.0.10 - frontend/DataTable: add column filtering to DataTable: complete rewrite of DataTable with proper use of useRef and useMemo
* [x] 1.0.9 - back to ubuntu-latest worker in update-dockerhub.yml
* [x] v1.0.8 - back to a versioning scheme that actually makes sense.
* [x] 1.0.8.1 - frontend/DataTable: removed react-change-highlight and implemented modern react 19 change detection with custom hook and useRef
* [x] 1.0.8.1 - frontend/DataTable: added ChangeHighlight/react-change-highlight and it kind of works, but slow and deprecated
* [x] 1.0.8.1 - frontend/Card: icon, title, titleExtra and collapsible+refresh icons are now properly aligned
* [x] 1.0.8.1 - frontend/pages: all Forms are now CardForm*
* [x] 1.0.8.1 - backend: bugfix in the refresh/pull container mechanic
* [x] 1.0.8.1 - frontend/Card: add refresh button, recieves a function
* [x] 1.0.8.1 - frontend/Card: add collapse buttonm using react-bootstrap/Collapse
* [x] 1.0.8 - looks good! release!
* [x] 1.0.7.9 - frontend/pages: cleanup and standardize variable names round 1
* [x] 1.0.7.9 - frontend/Settings: complete revamp
* [x] 1.0.7.9 - clear separation between infos and status
* [x] 1.0.7.8 - frontend/Card: added icons to Cards
* [x] 1.0.7.8 - backend/api: added dnsProvider storage in db
* [x] 1.0.7.8 - frontend/Settings: added dnsProvider entry, TODO: transform into dropdown
* [x] 1.0.7.8 - frontend/Accounts: added icons in Accordion titles
* [x] 1.0.7.8 - frontend/Accounts: added DNS Modal
* [x] 1.0.7.8 - frontend/Accounts: added DNS button
* [x] 1.0.7.8 - frontend/Accounts: new account and accounts list in Accordion
* [x] 1.0.7.8 - frontend/components: added Accordion
* [x] 1.0.7.7 - frontend/Accounts: reindex buttons only show if status.env.DOVECOT_FTS_PLUGIN != "none"
* [x] 1.0.7.7 - frontend/Accounts: add reindex buttons with 1s duration animation
* [x] 1.0.7.7 - frontend: added reindexAccount and /reindex call
* [x] 1.0.7.7 - backend: added reindexAccount and /api/reindex
* [x] 1.0.7.7 - backend: added jsonFixTrailingCommas and readDovecotConfFile
* [x] 1.0.7.7 - backend: pullServerStatus always pulls status, getServerStatus does it if refresh=true
* [x] 1.0.7.7 - backend: pullServerStatus should look for "fts = xapian" in /etc/dovecot/conf.d/*.conf
* [x] 1.0.7.7 - backend: pullServerStatus pulls status.status with Rrror StartedAt Health etc
* [x] 1.0.7.7 - backend: fix isRunning=unknown when stopped as container status returns all usual data even when stopped
* [x] 1.0.7.7 - backend: handle missing container or bad name
* [x] 1.0.7.6 - frontend/forms: bugfix in FormLogins.jsx as you cannot alter a const
* [x] 1.0.7.6 - frontend: api.js are all default export functions
* [x] 1.0.7.6 - backend: getServerStatus can be refreshed, saves status in db
* [x] 1.0.7.5 - frontend/DataTable: sorting algorith is perfect
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
* [x] 1.0.6.4 - backend: add functions getLogins addLogin
* [x] 1.0.6.4 - frontend/api: add api call getLogins addLogin
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
* [x] 1.0.5.5 - implement CONFIG_PATH
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
* [x] 1.0.3 - Variabilize DMS_SETUP_SCRIPT
* [x] 1.0.3 - Initial commit from someone else's AI slop

## DECISIONS

* [x] - Accounts: should "Create a dms-gui login for that account?" be unchecked by default? YES AND This should be a profile option stored as a config set for any user
* [x] - what happens when you delete a linked Account? Shouldn't the login be deleted too? YES
* [ ] - bugfix: why is create login checkbox forced when creating an Account?
* [-] - must pull all data with a progress bar after new container added successfully
* [ ] - backend: do we really want scoped queries per container? multiple DMS, really? if so, logins too should be scoped
* [ ] - Dashboard: there is no such thing as disk usage with docker. remove? yes. replace by what?
* [ ] - docker.sock seems frowned upon, why is it? Response from @polarathene:
  > The main concern is when giving write access to that API, you allow any compromised container with access to it to become root on the host (assuming rootful), which is obviously dangerous. This is less of a concern in more established projects where it may be used selectively out of trust, but smaller community projects it's a bigger ask for someone to trust the developer (the developer doesn't have to be malicious either, but is more likely at risk of being compromised themselves).
* [ ] - docker.sock seems frowned upon, how do we do without it? Maybe with Caddy and DMS api calls?
* [ ] - docker.sock could become caddy: see https://github.com/orgs/docker-mailserver/discussions/4584
* [ ] - add fail2ban management?
* [ ] - add fail2ban status?
* [ ] - add mailbox statistics?
* [ ] - offer DKIM DMARC display etc?
* [ ] - octoDNS may lack ability to modify/update and is designed to replace entire zones. Not sure it's the right tool
* [ ] - octoDNS may be able to pull the zone before pushing it with additions, looks like a lot of work
* [ ] - do we add multiple logins and roles?
* [ ] - reindex: doveadm index requires mailbox folder name, or can do it for all with `doveadm index -A -q \*`; and where do we add this option?
* [x] - octoDNS will have its own container as discussed here https://github.com/orgs/docker-mailserver/discussions/4584
* [-] - docker rootless seems simple enough but I am afraid of other consequences: https://docs.docker.com/engine/security/rootless/
* [-] - backend: separate server status from server info
* [-] - add octoDNS https://github.com/octodns/octodns but it's python; adds 99MB extra --> possible but nope we won't do that
* [-] - gave a try to octoDNS and after 2 hours of labor, I give up. Always the same error and bad samples all over the internet, not a single example they give works at all.
* [-] - frontend: convert all the db.*.json into browser json storage? no, sqlite3
* [-] - backend: added sql for accounts; nah, why?
* [x] - frontend/pages: refactor validate*Form and load them from individual files
* [-] - PORT_FRONTEND: package.json / .env / webpack etc... use hard coded 3001 - so what
* [-] - backend: get rid of the common.js?
* [-] - backend: explore Caddy idea https://github.com/orgs/docker-mailserver/discussions/4584#discussioncomment-14582516 - nope
* [x] - backend: explore python API idea as seen here https://github.com/Mailu/Mailu/blob/master/core/dovecot/start.py - yay
* [-] - backend/db: update sql{} with prepared common statements to speed up getModule API calls even more
* [-] - backend/settings: pullServerEnvs should also look for quota? --> nope, api call dump config
* [-] - frontend/Dashboard: where do we display Health/StartedAt etc? - don't care and don't use docker.sock anymore
* [x] - backend: pull aliases can only be done by an admin currently, that's by design.
* [-] - accounts: calls execDMS() with commands from dmsSetup{} in the same way as doveadm() uses domeadm{}? NOT YET because it hides what accounts/aliases etc will do; when we add execPoste() then we can revisit


## Misc

* Cannot start `better-sqlite3` with `node:slim` backend base image. Therefore, base all images on 24-alpine.
  * Error was: `Error loading shared library ld-linux-x86-64.so.2: No such file or directory (needed by /app/backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node)`
  * and that was fixed by adding `RUN apk add libc6-compat` to Dockerfile but now this new error: `Error relocating /app/backend/node_modules/better-sqlite3/build/Release/better_sqlite3.node: fcntl64: symbol not found`

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

<!--
## backend upgrade commands:
docker exec -it dms-gui sh
npm install -g npm-check-updates
npm install -g npm

cd /app/backend
npm version
{
  'dms-gui-backend': '1.0.0',
  npm: '11.17.0',
  node: '24.9.0',
  acorn: '8.15.0',
  ada: '3.2.7',
  amaro: '1.1.2',
  ares: '1.34.5',
  brotli: '1.1.0',
  cjs_module_lexer: '2.1.0',
  cldr: '47.0',
  icu: '77.1',
  llhttp: '9.3.0',
  modules: '137',
  napi: '10',
  nbytes: '0.1.1',
  ncrypto: '0.0.1',
  nghttp2: '1.66.0',
  openssl: '3.5.3',
  simdjson: '3.13.0',
  simdutf: '6.4.0',
  sqlite: '3.50.4',
  tz: '2025b',
  undici: '7.16.0',
  unicode: '16.0',
  uv: '1.51.0',
  uvwasi: '0.0.23',
  v8: '13.6.233.10-node.27',
  zlib: '1.3.1-470d3a2',
  zstd: '1.5.7'
}

npx npm-check-updates -u
 better-sqlite3        ^12.5.0  →        ^12.11.1
 cors                   ^2.8.5  →          ^2.8.6
 dockerode              ^4.0.9  →          ^5.0.0
 dotenv                ^17.2.3  →         ^17.4.2
 json-server     ^1.0.0-beta.3  →  ^1.0.0-beta.15
 node-cron              ^4.2.1  →          ^4.5.0
 prettier                3.7.4  →           3.8.4
 swagger-jsdoc          ^6.2.8  →          ^6.3.0

npm install
npm audit fix
  found 0 vulnerabilities
  npm warn allow-scripts 4 packages have install scripts not yet covered by allowScripts:
  npm warn allow-scripts   @scarf/scarf@1.4.0 (install: (install scripts present))
  npm warn allow-scripts   better-sqlite3@12.10.0 (install: node-gyp rebuild)
  npm warn allow-scripts   ssh2@1.17.0 (install: (install scripts present))
  npm warn allow-scripts   protobufjs@7.6.2 (postinstall: node scripts/postinstall)
  npm warn allow-scripts
  npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.
npm approve-scripts --all


## frontend upgrade commands: from the OS; do that once
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc
nvm install 24.9.0

## make sure your local node is the same as the VM: do that each time
source ~/.bashrc
nvm use 24.9.0
node -v

npm install -g npm-check-updates
npm install -g npm

cd /docker/dms/dms-gui/frontend
npm version
{
  'dms-gui-frontend': '1.0.0',
  npm: '11.16.0',
  node: '24.9.0',
  acorn: '8.15.0',
  ada: '3.2.7',
  amaro: '1.1.2',
  ares: '1.34.5',
  brotli: '1.1.0',
  cjs_module_lexer: '2.1.0',
  cldr: '47.0',
  icu: '77.1',
  llhttp: '9.3.0',
  modules: '137',
  napi: '10',
  nbytes: '0.1.1',
  ncrypto: '0.0.1',
  nghttp2: '1.66.0',
  openssl: '3.5.3',
  simdjson: '3.13.0',
  simdutf: '6.4.0',
  sqlite: '3.50.4',
  tz: '2025b',
  undici: '7.16.0',
  unicode: '16.0',
  uv: '1.51.0',
  uvwasi: '0.0.23',
  v8: '13.6.233.10-node.27',
  zlib: '1.3.1-470d3a2',
  zstd: '1.5.7'
}

npx npm-check-updates -u
 @babel/core          ^7.29.7  →   ^8.0.1    [missing time]
 @babel/preset-env    ^7.29.7  →   ^8.0.2    [missing time]
 @babel/preset-react  ^7.29.7  →   ^8.0.1    [missing time]
 @mui/material         ^9.1.0  →   ^9.1.1    [missing time]
 axios                ^1.17.0  →  ^1.18.1    [missing time]
 prettier               3.8.3  →    3.8.4    [missing time]
 react-router-dom     ^7.17.0  →  ^7.18.0    [missing time]
 webpack-dev-server    ^5.2.4  →   ^5.2.5    [missing time]

npm install
npm audit fix
  found 0 vulnerabilities


## finally, purge all caches and rebuild
cd /docker/dms/dms-gui
docker-compose build --no-cache
docker-compose up --build --force-recreate




################################ since last webpack upgrade 2026-06-08:
# npm audit report

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install webpack-dev-server@1.16.5, which is a breaking change
node_modules/uuid
  sockjs  >=0.3.17
  Depends on vulnerable versions of uuid
  node_modules/sockjs
    webpack-dev-server  >=2.0.0-beta
    Depends on vulnerable versions of sockjs
    node_modules/webpack-dev-server
      webpack-cli  >=7.0.0
      Depends on vulnerable versions of webpack-dev-server
      node_modules/webpack-cli

## and build fails:
 > [frontend-builder 7/7] RUN npm run build:
0.452
0.452 > dms-gui-frontend@1.0.0 build
0.452 > webpack --mode development
0.452
10.24 assets by info 307 KiB [immutable]
10.24   asset 1295669cd4e305c97f2c.woff?e34853135f9e39acf64315236852cd5a 176 KiB [emitted] [immutable] [from: node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff?e34853135f9e39acf64315236852cd5a] (auxiliary name: main)
10.24   asset 92ea18a81d737146ff04.woff2?e34853135f9e39acf64315236852cd5a 131 KiB [emitted] [immutable] [from: node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff2?e34853135f9e39acf64315236852cd5a] (auxiliary name: main)
10.24 asset bundle.js 4.92 MiB [emitted] (name: main)
10.24 asset favicon-32x32.png 1.1 KiB [emitted]
10.24 asset index.html 616 bytes [emitted]
10.24 orphan modules 332 KiB [orphan] 249 modules
10.24 runtime modules 3.13 KiB 11 modules
10.24 modules by path ./node_modules/ 3.26 MiB (javascript) 307 KiB (asset)
10.24   javascript modules 3.26 MiB 609 modules
10.24   asset modules 307 KiB (asset) 84 bytes (javascript) 2 modules
10.24 modules by path ./src/ 433 KiB
10.24   javascript modules 415 KiB 33 modules
10.24   json modules 17.9 KiB 2 modules
10.24 modules by mime type image/svg+xml 5.03 KiB
10.24   data:image/svg+xml,%3csvg xmlns=%27.. 281 bytes [built] [code generated]
10.24   data:image/svg+xml,%3csvg xmlns=%27.. 281 bytes [built] [code generated]
10.24   + 17 modules
10.24 ./frontend.mjs 8.57 KiB [built] [code generated]
10.24 ../common.mjs 17.1 KiB [built] [code generated]
10.24
10.24 ERROR in ./node_modules/@mui/material/internal/Transition.mjs 10:0-83
10.24 Module not found: Error: Can't resolve 'react-transition-group/TransitionGroupContext' in '/app/frontend/node_modules/@mui/material/internal'
10.24 Did you mean 'TransitionGroupContext.js'?
10.24 BREAKING CHANGE: The request 'react-transition-group/TransitionGroupContext' failed to resolve only because it was resolved as fully specified
...

## solution:
## 1. modify webpack
module.exports = {
  // ... rest of your config ...
  module: {
    rules: [
      // 1. ADD THIS AT THE VERY TOP OF YOUR RULES ARRAY:
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false // Tells webpack to allow extensionless paths inside .mjs files
        }
      },
      // 2. Your existing babel/js/jsx loaders continue below:
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' }
      }
    ]
  }
};

## 2. Regenerate lockfile locally
cd /docker/dms/dms-gui/frontend

# a. Manually add the dual-compatibility package to your host dependencies
npm install react-transition-group@4.4.5 --save-exact 

# b. Re-compile the frozen package-lock file
npm install

## 3. Run build alias with build-cache bypass
# Force docker compose build to drop cache and process stage 1 fresh
cd /docker/dms/dms-gui
docker-compose build --no-cache

# Run your standard execution container startup
buildup
################################

################################ option 2: Update the Root Developer Utility Triggering the Chain
cd /docker/dms/dms-gui/frontend
npm install --save-dev webpack-cli@latest webpack-dev-server@latest

# Clean local state
rm -rf node_modules package-lock.json
npm install
  # npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
################################ option 2: Update the Root Developer Utility Triggering the Chain

################################ option 1: Force a targeted update on the nested package range
npm update uuid --depth=10
  # npm warn update The --depth option no longer has any effect. See RFC0019.
  # npm warn update https://github.com/npm/rfcs/blob/latest/implemented/0019-remove-update-depth-option.md
################################ option 1: Force a targeted update on the nested package range

################################ option 3: Force a Clean Sub-dependency Audit Fix
cd /docker/dms/dms-gui/frontend
npm audit fix --json
npm update uuid
# uuid": {"version": "8.3.2", ...}

# there is no solution. don't run npm audit fix and move on with your life
rm package-lock.json
npm install

# Force docker compose build to drop cache and process stage 1 fresh
cd /docker/dms/dms-gui
docker-compose build --no-cache

# Run your standard execution container startup
buildup

################################ option 3: Force a Clean Sub-dependency Audit Fix


-->

