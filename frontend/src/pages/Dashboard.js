import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getServerStatus, getAccounts, getAliases } from '../services/api';
import { AlertMessage, DashboardCard, LoadingSpinner } from '../components';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Dashboard = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState({
    status: 'loading',
    resources: { cpu: '0%', memory: '0MB', disk: '0%' },
  });
  const [accountsCount, setAccountsCount] = useState(0);
  const [aliasesCount, setAliasesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch data in parallel
        const [statusResponse, accountsResponse, aliasesResponse] =
          await Promise.all([getServerStatus(), getAccounts(), getAliases()]);

        setStatus(statusResponse);
        setAccountsCount(accountsResponse.length);
        setAliasesCount(aliasesResponse.length);
        setError(null);
      } catch (err) {
        console.error(t('api.errors.fetchServerStatus'), err);
        setError('api.errors.fetchServerStatus');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.status === 'running') return 'success';
    if (status.status === 'stopped') return 'danger';
    return 'warning';
  };

  const getStatusText = () => {
    if (status.status === 'running') return 'dashboard.status.running';
    if (status.status === 'stopped') return 'dashboard.status.stopped';
    return 'dashboard.status.unknown';
  };

  if (loading && !status) {
    return <LoadingSpinner />;
  }

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
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.cpuUsage"
            icon="cpu"
            iconColor="primary"
            value={status.resources.cpu}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.memoryUsage"
            icon="memory"
            iconColor="info"
            value={status.resources.memory}
          />
        </Col>
        <Col md={3} className="mb-3">
          <DashboardCard
            title="dashboard.diskUsage"
            icon="hdd"
            iconColor="warning"
            value={status.resources.disk}
          />
        </Col>
      </Row>{' '}
      {/* Close first Row */}
      <Row className="mt-4">
        {' '}
        {/* Use Row component */}
        <Col md={6} className="mb-3">
          <DashboardCard
            title="dashboard.emailAccounts"
            icon="person-circle"
            iconColor="success"
            value={accountsCount}
          />
        </Col>
        <Col md={6} className="mb-3">
          <DashboardCard
            title="dashboard.aliases"
            icon="arrow-left-right"
            iconColor="secondary"
            value={aliasesCount}
          />
        </Col>
      </Row>{' '}
      {/* Close second Row */}
    </div>
  );
};

export default Dashboard;
