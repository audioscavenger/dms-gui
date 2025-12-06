import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
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
  const [containerName] = useLocalStorage("containerName");
  const [mailservers] = useLocalStorage("mailservers");
  
  const [status, setServerStatus] = useState({
    status: {
      status: 'loading',
      error: undefined,
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
  
  const [isStatusLoading, setStatusLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchAll();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    fetchDashboard();
  };

  const fetchDashboard = async () => {
    if (!mailservers || !mailservers.length) return;
    if (!containerName) return;

    try {
      setStatusLoading(true);

      const statusData = await getServerStatus('mailserver', getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName);
      if (statusData.success) {

        setServerStatus(statusData.message);
        setErrorMessage(null);
        
      } else setErrorMessage(statusData?.error);
      
    } catch (error) {
      errorLog(t('api.errors.fetchServerStatus'), error);
      setErrorMessage('api.errors.fetchServerStatus');
      
    } finally {
      setStatusLoading(false);
    }
  };

  const rebootMe = async () => {
    
    killContainer('dms-gui', 'dms-gui', 'dms-gui');
    logout();
  };

  const getStatusColor = () => {
    if (status.status.status === 'loading') return 'secondary';
    if (status.status.status === 'alive') return 'warning';
    if (status.status.status === 'missing') return 'danger';
    if (status.status.status === 'api_gen') return 'warning';
    if (status.status.status === 'api_miss') return 'warning';
    if (status.status.status === 'api_error') return 'warning';
    if (status.status.status === 'api_unset') return 'warning';
    if (status.status.status === 'running') return 'success';
    if (status.status.status === 'stopped') return 'danger';
    if (status.status.status === 'unknown') return 'danger';
    return 'danger';
  };

  const getStatusText = () => {
    return `dashboard.status.${status.status.status}`;
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
          onClick={() => fetchAll(true)}
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
            isLoading={isStatusLoading}
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
            iconColor={isStatusLoading ? "secondary" : "success"}
            isLoading={isStatusLoading}
            value={status.db.logins}
            href="/logins"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.mailboxAccounts"
            icon="inboxes-fill"
            iconColor={isStatusLoading ? "secondary" : "success"}
            isLoading={isStatusLoading}
            value={status.db.accounts}
            href="/accounts"
          />
        </Col>
        <Col md={4} className="mb-3">
          <DashboardCard
            title="dashboard.aliases"
            icon="arrow-left-right"
            iconColor={isStatusLoading ? "secondary" : "success"}
            isLoading={isStatusLoading}
            value={status.db.aliases}
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
