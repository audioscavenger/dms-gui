import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';   // must include any elements that will interact with auth

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  byteSize2HumanSize,
} = require('../../frontend');
import {
  getServerStatus,
  getCount,
} from '../services/api';
import {
  AlertMessage,
  DashboardCard,
  LoadingSpinner,
  Button,
  Translate,
} from '../components';

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Dashboard = () => {
  const { t } = useTranslation();
  const [status, setServerStatus] = useState({
    status: {
      status: 'loading',
      Error: '',
      StartedAt: '',
      FinishedAt: '',
      Health: '',
    },
    resources: {
      cpuUsage: 'N/A',
      memoryUsage: 'N/A',
      diskUsage: 'N/A',
    },
  });
  const [accountsCount, setAccountsCount] = useState(0);
  const [aliasesCount, setAliasesCount] = useState(0);
  const [loginsCount, setLoginsCount] = useState(0);
  
  // const [isLoading, setLoading] = useState(true);
  const [isStatusLoading, setStatusLoading] = useState(true);
  const [isAccountsLoading, setAccountsLoading] = useState(true);
  const [isAliasesLoading, setAliasesLoading] = useState(true);
  const [isLoginsLoading, setLoginsLoading] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState(null);

  // const { logout } = useAuth();
  // const { user } = useAuth();
  // const handleLogout = () => {
    // logout();
  // };
  // /*
            // {(user) &&
              // <Button
              // variant="secondary"
              // onClick={handleLogout}
              // text="login.logout"
              // />
            // }
  // */

  useEffect(() => {
    fetchAll();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAll = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    
    fetchDashboard();
    fetchLogins();
    fetchAccounts(refresh);
    fetchAliases(refresh);
    
  };

  const fetchDashboard = async () => {
    
    try {
      // setLoading(true);
      setStatusLoading(true);

      const statusData = await getServerStatus(undefined);

      setServerStatus(statusData);
      setErrorMessage(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchServerStatus'), err);
      setErrorMessage('api.errors.fetchServerStatus');
      
    } finally {
      // setLoading(false);
      setStatusLoading(false);
    }
  };

  const fetchAccounts = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    
    try {
      setAccountsLoading(true);

      // const accountsResponse = await getAccounts(refresh);
      // setAccountsCount(accountsResponse.length);
      const count = await getCount('accounts');
      setAccountsCount(count);
      setErrorMessage(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchAccounts'), err);
      setErrorMessage('api.errors.fetchAccounts');
      
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchAliases = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    
    try {
      setAliasesLoading(true);

      // const aliasesResponse = await getAliases(refresh);
      // setAliasesCount(aliasesResponse.length);
      const count = await getCount('aliases');
      setAliasesCount(count);
      setErrorMessage(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchfetchAliases'), err);
      setErrorMessage('api.errors.fetchfetchAliases');
      
    } finally {
      setAliasesLoading(false);
    }
  };

  const fetchLogins = async () => {
    
    try {
      setLoginsLoading(true);

      // const loginsResponse = await getLogins();
      // setLoginsCount(loginsResponse.length);
      const count = await getCount('logins');
      setLoginsCount(count);
      setErrorMessage(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchLogins'), err);
      setErrorMessage('api.errors.fetchLogins');
      
    } finally {
      setLoginsLoading(false);
    }
  };


  const getStatusColor = () => {
    if (status.status.status === 'running') return 'success';
    if (status.status.status === 'stopped') return 'danger';
    if (status.status.status === 'missing') return 'danger';
    if (status.status.status === 'loading') return 'secondary';
    return 'warning';
  };

  const getStatusText = () => {
    if (status.status.status === 'running') return 'dashboard.status.running';
    if (status.status.status === 'stopped') return 'dashboard.status.stopped';
    if (status.status.status === 'missing') return 'dashboard.status.stopped';
    if (status.status.status === 'loading') return 'dashboard.status.unknown';
    return 'dashboard.status.unknown';
  };

  // if (isLoading && !status && !Object.keys(status).length) {
    // return <LoadingSpinner />;
  // }

  return (
    <div>
      <div className="float-end position-sticky z-1">
        <Button
          variant="warning"
          size="sm"
          icon="arrow-repeat"
          title={t('common.refresh')}
          className="me-2"
          onClick={() => fetchAll(true)}
        />
      </div>

      <h2 className="mb-4">{Translate("dashboard.title")}</h2>
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
            isLoading={isStatusLoading}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.cpuUsage"
            icon="cpu"
            iconColor={isStatusLoading ? "secondary" : "primary"}
            isLoading={isStatusLoading}
            value={Number(status.resources.cpuUsage).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.memoryUsage"
            icon="memory"
            iconColor={isStatusLoading ? "secondary" : "info"}
            isLoading={isStatusLoading}
            value={Number(status.resources.memoryUsage).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.diskUsage"
            icon="hdd"
            iconColor={isStatusLoading ? "secondary" : "warning"}
            isLoading={isStatusLoading}
            value={status.resources.diskUsage}
          />
        </Col>
      </Row>{' '}
      
      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.logins"
            icon="person-lock"
            iconColor={isLoginsLoading ? "secondary" : "success"}
            isLoading={isLoginsLoading}
            value={loginsCount}
            href="/logins"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.mailboxAccounts"
            icon="inboxes-fill"
            iconColor={isAccountsLoading ? "secondary" : "success"}
            isLoading={isAccountsLoading}
            value={accountsCount}
            href="/accounts"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.aliases"
            icon="arrow-left-right"
            iconColor={isAliasesLoading ? "secondary" : "success"}
            isLoading={isAliasesLoading}
            value={aliasesCount}
            href="/aliases"
          />
        </Col>
      </Row>{' '}
      {/* Close second Row */}
    </div>
  );
};

export default Dashboard;
