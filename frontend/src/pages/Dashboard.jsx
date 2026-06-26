import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailStrict,
//   regexEmailStrict,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
  getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
} from '../../../common.mjs';
import {
  getAccounts,
  getAliases,
  getLogins,
  getServerStatus,
  killContainer,
} from '../services/api.mjs';

import {
  AlertMessage,
  DashboardCard,
  Button,
  LoadingSpinner,
  Translate,
} from '../components';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);
  
  const [isLoading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState({});

  // const [aliases, setAliases] = useLocalStorage("aliases", []);
  // const [accounts, setAccounts] = useLocalStorage("accounts", []);
  // const [logins, setLogins] = useLocalStorage("logins", []);
  // const [DOVECOT_FTS, setDOVECOT_FTS] = useState(0);
  
  const [status, setServerStatus] = useLocalStorage("status", {
    status: {
      status: 'loading',
      error: null,
    },
    resources: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
    },
    db: {
      logins: 0,
      accounts: 0,
      aliases: 0,
    },
  });
  
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);


  const refreshAll = async () => {
    // debugLog('ddebug refreshAll')
    try {
      await fetchAccounts(true);
      await fetchLogins();
      await fetchAliases(true);

    } finally {
      setSuccessMessage(t('dashboard.isFirstRun', {
        containerName:containerName,
      }));
    }
  };


  const fetchDashboard = async () => {
    
    // debugLog('ddebug fetchDashboard')
    try {
      setLoading(true);

      // const statusData = await getServerStatus('mailserver', getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName);
      const statusData = await getServerStatus('mailserver', containerName);
      // debugLog('ddebug statusData',statusData)
      if (statusData?.success) {

        setErrorMessage(null);
        setServerStatus(statusData.message);
        
        // handle API errors
        if (new Set(['api_gen', 'api_miss', 'api_match', 'api_unset', 'api_error', 'port_closed', 'port_timeout', 'port_unknown', 'unknown']).has(statusData.message.status.status)) {
          setErrorMessage(`dashboard.errors.${statusData.message.status.status}`);

        } else {

          // force a global refresh if everything is empty; RISK: can a user start from a DMS server with zero accounts? that would execute every time
          if (statusData.message.db.aliases == 0 && statusData.message.db.accounts == 0 && statusData.message.db.logins <= 1) {
            refreshAll();
          }

          return statusData.message;
        }
        
      } else setErrorMessage(statusData?.error);
      
    } catch (error) {
      // debugLog('ddebug error', error)
      errorLog(t('api.errors.fetchServerStatus'), error);
      setErrorMessage({key: 'api.errors.fetchServerStatus', values: { error: error.message }});
      
    } finally {
      setLoading(false);
    }
  };

  const rebootMe = async () => {
    if (user.isAdmin) {
      killContainer('dms-gui', 'dms-gui', 'dms-gui');
      logout();
    }
  };

  const getStatusColor = () => {
    if (status.status.status === 'loading') return 'secondary';
    if (status.status.status === 'alive') return 'warning';
    if (status.status.status === 'missing') return 'danger';
    if (status.status.status === 'api_gen') return 'warning';
    if (status.status.status === 'api_miss') return 'warning';
    if (status.status.status === 'api_match') return 'warning';
    if (status.status.status === 'api_unset') return 'warning';
    if (status.status.status === 'api_error') return 'danger';
    if (status.status.status === 'port_closed') return 'danger';
    if (status.status.status === 'port_timeout') return 'warning';
    if (status.status.status === 'port_unknown') return 'danger';
    if (status.status.status === 'running') return 'success';
    if (status.status.status === 'stopped') return 'danger';
    if (status.status.status === 'unknown') return 'danger';
    return 'danger';
  };

  const getStatusText = () => {
    return `dashboard.status.${status.status.status}`;
  };

  const fetchAliases = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    debugLog(`fetchAliases call getAliases(${refresh})`);
    
    try {
      handleRefreshCard("aliases");
      setErrorMessage(null);
      setSuccessMessage(null);
      
      // const [aliasesData, accountsData] = await Promise.all([
      const [aliasesData] = await Promise.all([
        // getAliases(getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, refresh),
        getAliases(containerName, refresh),
        // getAccounts(containerName),           // refresh accounts is done on first load or in Accounts page
      ]);

      // if (accountsData?.success) {
      //   debugLog('accountsData', accountsData);                 // [ { mailbox: 'a@a.com', domain:'a.com', storage: {} },{ mailbox: 'b@b.com', domain:'b.com', storage: {} }, .. ]
        // setAccounts(accountsData.message);
      // } else setErrorMessage(accountsData?.error);
      
      if (aliasesData?.success) {
        debugLog('aliasesData', aliasesData);
        // add color column for regex aliases
        // let aliasesDataFormatted = aliasesData.message.map(alias => { return { 
        //   ...alias, 
        //   color:  (alias.regex) ? "text-info" : "",
        //   }; });
        // setAliases(aliasesDataFormatted);
        // debugLog('aliasesDataFormatted', aliasesDataFormatted); // [ { source: 'a@b.com', destination:'b@b.com', regex: 0, color: '' }, .. ]
        // bug: this never works for some reason
        setServerStatus(prev => ({
          ...prev,                                  // 1. Copy top level using your state variable
          db: {
            ...prev.db,                             // 2. Copy the db level (keeps aliases intact)
            aliases: aliasesData.message.length,     // 3. Update count
          }
        }));
        
      } else setErrorMessage(aliasesData?.error);
      

    } catch (error) {
      errorLog(t('api.errors.fetchAliases'), error);
      // setErrorMessage('api.errors.fetchAliases');
      setErrorMessage({key: 'api.errors.fetchAliases', values: { error: error.message }});
      
    } finally {
      handleRefreshCard("aliases", false);
    }
  };

  const fetchAccounts = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    debugLog(`fetchAliases call fetchAccounts(${refresh})`);

    try {
      handleRefreshCard("accounts");
      setErrorMessage(null);
      setSuccessMessage(null);
      
      // const [accountsData, DOVECOT_FTSdata] = await Promise.all([
      //   getAccounts(containerName, refresh),
      //   getServerEnvs('mailserver', containerName, refresh, 'DOVECOT_FTS'),
      // ]);
      const accountsData = await getAccounts(containerName, refresh);
      if (accountsData?.success) {
        debugLog('accountsData', accountsData);
        // setAccounts(accountsData.message);
        // bug: this never works for some reason
        setServerStatus(prev => ({
          ...prev,                                  // 1. Copy top level using your state variable
          db: {
            ...prev.db,                             // 2. Copy the db level (keeps aliases intact)
            accounts: accountsData.message.length,    // 3. Update count
          }
        }));

        // const DOVECOT_FTSdata = await getServerEnvs('mailserver', containerName, refresh, 'DOVECOT_FTS');
        // debugLog('ddebug DOVECOT_FTSdata', DOVECOT_FTSdata);
        // if (DOVECOT_FTSdata?.success) {
        //   setDOVECOT_FTS(DOVECOT_FTSdata.message);
          
        // } else setErrorMessage(DOVECOT_FTSdata?.error);
        
      } else setErrorMessage(accountsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchAccounts'), error);
      // setErrorMessage(t('api.errors.fetchAccounts'), ": ", error);
      setErrorMessage({key: 'api.errors.fetchAccounts', values: { error: error.message }});
      
    } finally {
      handleRefreshCard("accounts", false);
    }
  };


  const fetchLogins = async () => {
    // debugLog('ddebug fetchLogins')

    try {
      handleRefreshCard("logins");
      const [loginsData] = await Promise.all([    // loginsData better have a uniq readOnly id field we can use, as we may modify each other fields
        getLogins(),
      ]);

      if (loginsData?.success) {
        debugLog('loginsData', loginsData);
        // let loginsDataAltered = await formatLoginsForTable(loginsData.message);
        // debugLog('loginsDataAltered', loginsDataAltered);
        // setLogins(loginsDataAltered);
        // bug: this never works for some reason
        setServerStatus(prev => ({
          ...prev,                                  // 1. Copy top level using your state variable
          db: {
            ...prev.db,                             // 2. Copy the db level (keeps aliases intact)
            logins: loginsData.message.length,      // 3. Update count
          }
        }));

      } else setErrorMessage(loginsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchLogins'), error);
      // setErrorMessage('api.errors.fetchLogins');
      setErrorMessage({key: 'api.errors.fetchLogins', values: { error: error.message }});
      
    } finally {
      handleRefreshCard("logins", false);
    }
  };


  const handleRefreshCard = (cardId, status=true) => {
    // Turn loading on for this specific card
    setCardLoading(prev => ({ 
      ...prev, 
      [cardId]: status 
    }));
  };


  useEffect(() => {
    // debugLog('ddebug mailservers.length',mailservers.length)
    // debugLog('ddebug containerName',containerName)
    if (!mailservers.length) return;
    if (!containerName) return;

    fetchDashboard();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, [containerName]);

  useEffect(() => {
    if (isLoading) {
      handleRefreshCard("logins");
      handleRefreshCard("accounts");
      handleRefreshCard("aliases");
    } else {
      handleRefreshCard("logins", false);
      handleRefreshCard("accounts", false);
      handleRefreshCard("aliases", false);
    }
  }, [isLoading]);


  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="float-end position-sticky z-1">
        <Button
          variant="warning"
          size="sm"
          icon="arrow-repeat"
          title={t('common.refresh')}
          className="me-2"
          onClick={() => fetchDashboard(true)}
        />
      </div>

      <h2 className="mb-4">{Translate('dashboard.title')} {t('common.forWhat', {what:containerName})}</h2>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />

      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={3} className="mb-3">
          {' '}
          {/* Use Col component and add bottom margin */}
          <DashboardCard
            key="serverStatus"
            title="dashboard.serverStatus"
            icon="hdd-rack-fill"
            iconColor={getStatusColor()}
            badgeColor={getStatusColor()}
            badgeText={getStatusText()}
            isLoading={isLoading}
          >
          {user?.isAdmin == 1 &&
            <Button
              variant="danger"
              size="sm"
              icon="recycle"
              title={t('dashboard.rebootMe')}
              className="position-absolute top-right shadow"
              onClick={() => rebootMe()}
            />
          }
          </DashboardCard>

        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            key="cpuUsage"
            title="dashboard.cpuUsage"
            icon="cpu"
            iconColor={isLoading ? "secondary" : "primary"}
            isLoading={isLoading}
            value={Number(status.resources.cpuUsage).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            key="memoryUsage"
            title="dashboard.memoryUsage"
            icon="memory"
            iconColor={isLoading ? "secondary" : "info"}
            isLoading={isLoading}
            value={Number(status.resources.memoryUsage).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            key="diskUsage"
            title="dashboard.diskUsage"
            icon="hdd"
            iconColor={isLoading ? "secondary" : "warning"}
            isLoading={isLoading}
            value={status.resources.diskUsage+'MB'}
          />
        </Col>
      </Row>{' '}
      
      {user?.isAccount != 1 &&
      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={4} className="mb-3">
          <DashboardCard
            key="logins"
            title="dashboard.logins"
            icon="person-lock"
            iconColor={cardLoading["logins"] ? "secondary" : "success"}
            isLoading={cardLoading["logins"]}
            value={status.db.logins}
            onClickRefresh={() => fetchLogins(true)}
            href="/logins"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            key="accounts"
            title="dashboard.accounts"
            icon="inboxes-fill"
            iconColor={cardLoading["accounts"] ? "secondary" : "success"}
            isLoading={cardLoading["accounts"]}
            value={status.db.accounts}
            onClickRefresh={() => fetchAccounts(true)}
            href="/accounts"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            key="aliases"
            title="dashboard.aliases"
            icon="arrow-left-right"
            iconColor={cardLoading["aliases"] ? "secondary" : "success"}
            isLoading={cardLoading["aliases"]}
            value={status.db.aliases}
            onClickRefresh={() => fetchAliases(true)}
            href="/aliases"
          />
        </Col>
      </Row>
      }
      {/* Close second Row */}
    </div>
  );
};

export default Dashboard;
