import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';   // must include any elements that will interact with auth

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('../../frontend.js');
import {
  getServerStatus, 
  getAccounts, 
  getAliases 
} from '../services/api';
import {
  AlertMessage,
  DashboardCard,
  LoadingSpinner,
  Button,
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
  const [isLoading, setLoading] = useState(true);
  const [isStatusLoading, setStatusLoading] = useState(true);
  const [isAccountsLoading, setAccountsLoading] = useState(true);
  const [isAliasesLoading, setAliasesLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetchDashboard();
    fetchAccounts();
    fetchAliases();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    
    try {
      // setLoading(true);
      setStatusLoading(true);

      const statusData = await getServerStatus(true);

      setServerStatus(statusData);
      setError(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchServerStatus'), err);
      setError('api.errors.fetchServerStatus');
    } finally {
      // setLoading(false);
      setStatusLoading(false);
    }
  };

  const fetchAccounts = async () => {
    
    try {
      setAccountsLoading(true);

      const accountsResponse = await getAccounts(false);

      setAccountsCount(accountsResponse.length);
      setError(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchAccounts'), err);
      setError('api.errors.fetchAccounts');
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchAliases = async () => {
    
    try {
      setAliasesLoading(true);

      const aliasesResponse = await getAliases(false);

      setAliasesCount(aliasesResponse.length);
      setError(null);
      
    } catch (err) {
      errorLog(t('api.errors.fetchfetchAliases'), err);
      setError('api.errors.fetchfetchAliases');
    } finally {
      setAliasesLoading(false);
    }
  };


  const getStatusColor = () => {
    if (status.status.status === 'running') return 'success';
    if (status.status.status === 'stopped') return 'danger';
    if (status.status.status === 'loading') return 'secondary';
    return 'warning';
  };

  const getStatusText = () => {
    if (status.status.status === 'running') return 'dashboard.status.running';
    if (status.status.status === 'stopped') return 'dashboard.status.stopped';
    if (status.status.status === 'loading') return 'dashboard.status.unknown';
    return 'dashboard.status.unknown';
  };

  // if (isLoading && !status && !Object.keys(status).length) {
    // return <LoadingSpinner />;
  // }

  return (
    <div>
      <h2 className="mb-4">{t('dashboard.title')}</h2>
      <AlertMessage type="danger" message={error} />

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
            value={(Number(status.resources.cpuUsage) * 100).toFixed(2)+'%'}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.memoryUsage"
            icon="memory"
            iconColor={isStatusLoading ? "secondary" : "info"}
            isLoading={isStatusLoading}
            value={Number(status.resources.memoryUsage / 1024 / 1024).toFixed()+'MB'}
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
      
      <Row className="mt-4">
        {' '}
        {/* Use Row component */}
        <Col md={6} className="mb-3">
          <DashboardCard
            title="dashboard.emailAccounts"
            icon="person-circle"
            iconColor={isAccountsLoading ? "secondary" : "success"}
            isLoading={isAccountsLoading}
            value={accountsCount}
          />
        </Col>
        <Col md={6} className="mb-3">
          <DashboardCard
            title="dashboard.aliases"
            icon="arrow-left-right"
            iconColor={isAliasesLoading ? "secondary" : "success"}
            isLoading={isAliasesLoading}
            value={aliasesCount}
          />
        </Col>
      </Row>{' '}
      {/* Close second Row */}
    </div>
  );
};

export default Dashboard;
