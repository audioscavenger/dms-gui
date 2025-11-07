I work on this solo, until someone finds an interest like I do. Not claiming I can get to the level of complexity `Mailu` admin UI offers, but the goal is to have some usability.

The `setup` offered by DMS is quite good tbh, and sufficient for 90% of your daily operations. But sometimes a quick glance at a modern dashboard is also beneficial.

The primary goals are:

1. [x] kick start the project: **done**, thanks to dunajdev and Claude
2. [x] refactor, fix all the bugs, document and define scope: **done/WIP**
3. [x] ability to load/save/refresh data from json files or dms commands: **done**
4. [x] add rebuild/refresh xapian index buttons in Accounts page: **done**
5. [x] add a login page
6. [ ] add DNS entries page
7. [ ] add DKIM (re)gen option somewhere, maybe Accounts? with subsection by domain?
8. [ ] Ultimate goal: add DNS push entries with custom cloudflare API or octoDNS

After (7) my life will be complete and I won't need to work on this anymore :D

## BUGS:

* [ ] - frontend/LeftSidebar: LeftSidebar cannot collapse properly
* [ ] - frontend/LeftSidebar: LeftSidebar is only as high as the window on first load, when you scroll down it's blank
* [ ] - frontend/DataTable usePrevious to highlight data change on reload/change does not work anymore
* [ ] - frontend/Logins: saving email modification produces NotFoundError: Node.insertBefore: Child to insert before is not a child of this node

## TODO:

The **done** list versions is in reverse order, as you want to see the most recents firt.

The TODO list rank is in order, as you naturally read from top to bottom and therefore, the most difficult ones are at the top.


### chores:

* [ ] - chore/frontend: api.js and plenty other files could also use translate for their error messages
* [ ] - chore/translation: what are all those cannot* messages? no module uses them
* [ ] - chore/frontend: move all error messages into translation
* [ ] - chore/frontend: add auth bearer token for APIs and /docs
* [ ] - chore: add more comments and beautify navigation pane with ASCII art
* [ ] - chore: refactoring in progress as advised by @polarathene
* [ ] - chore: add auto-refresh + option
* [ ] - chore: add refresh all on start after Login + option

### frontend:

* [ ] - frontend/pages: add proxy to rspamd page
* [ ] - frontend/pages: add link to snappymail when said variable is detected
* [ ] - frontend/pages: refactor Column definitions for accounts/alias/* table and load them from individual files
* [ ] - frontend/Dashboard:  add current hacking attempts
* [ ] - frontend/Settings: add option to not confirm deletions in handleDelete and others
* [ ] - frontend/Dashboard: where do we display Health/StartedAt etc?
* [ ] - frontend/Accounts: transform account storage values into bytes so we can sort them
* [ ] - frontend/App: refactor Sidebar to be collapsible, as it is the actual menu; certainly need to rewrite the homepage entirely
* [ ] - frontend/Logins: provide a way for users to change their profile email and password
* [ ] - frontend/Logins: why can't I change the email directly in the email field?
* [ ] - frontend/backups.js: add file
* [ ] - frontend/imports.js: add file
* [ ] - frontend/Logins: also ProtectedRoute: get isAdmin isActive and roles to deny login and not display certain pages
* [ ] - frontend/Backups: add page
* [ ] - frontend/Imports: add page
* [ ] - frontend/Domains: add FormDNS or page

### backend:
* [ ] - backend: update emailValidChars based off what dms actually accepts: pretty sure ~ is not accepted
* [ ] - backend: get rid of the common.js?
* [ ] - backend: mutate the common data transform functions as Class from Array() and Object() objects
* [ ] - backend: mutate the String with data transform/validation functions as Class
* [ ] - backend/domains: add dkim modules and exec calls
* [-] - backend/settings: pullServerEnvs should also look for quota? --> nope, api call dump config
* [ ] - backend/settings: pull compress method and maybe statistics on the dashboard?
* [ ] - backend/db: update sql{} with prepared common statements to speed up getModule API calls even more
* [ ] - backend/accounts: switch fts and quota etc detection from reading files to `dovecot -n reports` or `doveconf -P` command instead
* [ ] - backend: explore Caddy idea https://github.com/orgs/docker-mailserver/discussions/4584#discussioncomment-14582516
* [ ] - backend: explore python API idea as seen here https://github.com/Mailu/Mailu/blob/master/core/dovecot/start.py


### history:

* [x] 1.3.2 - backend: tried accessToken+localStorage, now switched to HTTP-Only cookie, but still use localStorage for user roles etc
* [x] 1.3.2 - docker/start.sh: implement random SECRET_KEY generation on start of container
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
* [x] 1.2.5 - backend: added execInContainerAPI() and sendJsonToApi() and all seems to work escept 
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
* [x] 1.2.1 - backend/frontend: refactor ALL the execSetup API calls to handle result.success and result.message instead of throwing error 500
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
* [x] 1.0.18 - frontend: fixed Accounts.js and ServerInfos.jsx to use new getServerInfos and getServerEnvs
* [x] 1.0.18 - backend/api: getServerInfos is simplified and created getServerEnvs
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
* [x] 1.0.15 - backend/db: proper error handling for dbOpen, dbRun, dbGet, dbAll, dbInit, dbUpdate
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
* [-] - PORT_NODEJS: package.json / .env / webpack etc... use hard coded 3001 - so what


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

