import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailRegex,
//   regexFindEmailStrict,
//   regexFindEmailLax,
//   regexEmailRegex,
//   regexEmailStrict,
//   regexEmailLax,
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
  getServerEnvs,
  getServerStatus,
  killContainer,
} from '../services/api.mjs';

import {
  AlertMessage,
  DashboardCard,
  Button,
  Translate,
} from '../components/index.jsx';
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
  
  const [aliases, setAliases] = useLocalStorage("aliases", []);
  const [accounts, setAccounts] = useLocalStorage("accounts", []);
  const [DOVECOT_FTS, setDOVECOT_FTS] = useState(0);
  
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

  useEffect(() => {
    if (!mailservers || !mailservers.length) return;
    if (!containerName) return;

    fetchDashboard();

    if (!status.db.accounts?.length && !status.db.aliases?.length) {
      fetchAll();
    }

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, []);


  const fetchAll = async () => {
    try {
      fetchAccounts(true);
      fetchAliases(true);
      fetchDashboard();

    } finally {
      setLoading(false);
    }
  };
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      // const statusData = await getServerStatus('mailserver', getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName);
      const statusData = await getServerStatus('mailserver', containerName);
      if (statusData?.success) {

        setErrorMessage(null);
        setServerStatus(statusData.message);
        if (['api_gen', 'api_miss', 'api_match', 'api_unset', 'api_error', 'port_closed', 'port_timeout', 'port_unknown', 'unknown'].includes(statusData.message.status.status)) setErrorMessage(`dashboard.errors.${statusData.message.status.status}`);
        
      } else setErrorMessage(statusData?.error);
      
    } catch (error) {
      errorLog(t('api.errors.fetchServerStatus'), error);
      // setErrorMessage('api.errors.fetchServerStatus');
      setErrorMessage(statusData.message);
      
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
    debugLog(`fetchAliases call getAliases(${refresh}) and getAccounts(${containerName}, ${refresh})`);
    
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const [aliasesData, accountsData] = await Promise.all([
        // getAliases(getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, refresh),
        getAliases(containerName, refresh),
        getAccounts(containerName),           // refresh accounts is done on first load or in Accounts page
      ]);

      if (accountsData?.success) {
        setAccounts(accountsData.message);
        debugLog('accountsData', accountsData);                 // [ { mailbox: 'a@a.com', domain:'a.com', storage: {} },{ mailbox: 'b@b.com', domain:'b.com', storage: {} }, .. ]
      } else setErrorMessage(accountsData?.error);
      
      if (aliasesData?.success) {
        // add color column for regex aliases
        let aliasesDataFormatted = aliasesData.message.map(alias => { return { 
          ...alias, 
          color:  (alias.regex) ? "text-info" : "",
          }; });
        setAliases(aliasesDataFormatted);
        debugLog('aliasesDataFormatted', aliasesDataFormatted); // [ { source: 'a@b.com', destination:'b@b.com', regex: 0, color: '' }, .. ]
        
      } else setErrorMessage(aliasesData?.error);
      

    } catch (error) {
      errorLog(t('api.errors.fetchAliases'), error);
      setErrorMessage('api.errors.fetchAliases');
      
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      // const [accountsData, DOVECOT_FTSdata] = await Promise.all([
      //   getAccounts(containerName, refresh),
      //   getServerEnvs('mailserver', containerName, refresh, 'DOVECOT_FTS'),
      // ]);
      const accountsData = await getAccounts(containerName, refresh);
      if (accountsData?.success) {
        setAccounts(accountsData.message);
        debugLog('ddebug accountsData', accountsData);

        const DOVECOT_FTSdata = await getServerEnvs('mailserver', containerName, refresh, 'DOVECOT_FTS');
        debugLog('ddebug DOVECOT_FTSdata', DOVECOT_FTSdata);
        if (DOVECOT_FTSdata?.success) {
          setDOVECOT_FTS(DOVECOT_FTSdata.message);
          
        } else setErrorMessage(DOVECOT_FTSdata?.error);
        
      } else setErrorMessage(accountsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchAccounts'), error);
      setErrorMessage(t('api.errors.fetchAccounts'), ": ", error);
      
    } finally {
      setLoading(false);
    }
  };




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

      <h2 className="mb-4">{Translate('dashboard.title')} {t('common.for', {what:containerName})}</h2>
      <AlertMessage type="danger" message={errorMessage} />

      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={3} className="mb-3">
          {' '}
          {/* Use Col component and add bottom margin */}
          <DashboardCard
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
            title="dashboard.cpuUsage"
            icon="cpu"
            iconColor={isLoading ? "secondary" : "primary"}
            isLoading={isLoading}
            value={Number(status.resources.cpuUsage).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.memoryUsage"
            icon="memory"
            iconColor={isLoading ? "secondary" : "info"}
            isLoading={isLoading}
            value={Number(status.resources.memoryUsage).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
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
            title="dashboard.logins"
            icon="person-lock"
            iconColor={isLoading ? "secondary" : "success"}
            isLoading={isLoading}
            value={status.db.logins}
            href="/logins"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.mailboxAccounts"
            icon="inboxes-fill"
            iconColor={isLoading ? "secondary" : "success"}
            isLoading={isLoading}
            value={status.db.accounts}
            onClickRefresh={() => fetchAccounts(true)}
            href="/accounts"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.aliases"
            icon="arrow-left-right"
            iconColor={isLoading ? "secondary" : "success"}
            isLoading={isLoading}
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
