import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertMessage, Button, Card, FormField } from '../components';

const Settings = () => {
  const { t } = useTranslation();
  const [setupPath, setSetupPath] = useState(
    '/path/to/docker-mailserver/setup.sh'
  );
  const [containerName, setContainerName] = useState('mailserver');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'setupPath') {
      setSetupPath(value);
    } else if (id === 'containerName') {
      setContainerName(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setError(null);

    // In a real application, we would save settings to the backend
    // For demonstration, we'll just show a success message
    try {
      setSuccessMessage('settings.saveSuccess');
    } catch (err) {
      setError('settings.saveError');
    }
  };

  return (
    <div>
      <h2 className="mb-4">{t('settings.title')}</h2>

      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={successMessage} />

      <Card title="settings.configTitle" className="mb-4">
        <form onSubmit={handleSubmit} className="form-wrapper">
          <FormField
            type="text"
            id="setupPath"
            name="setupPath"
            label="settings.setupPath"
            value={setupPath}
            onChange={handleInputChange}
            placeholder="/path/to/docker-mailserver/setup.sh"
            helpText="settings.setupPathHelp"
            required
          />

          <FormField
            type="text"
            id="containerName"
            name="containerName"
            label="settings.containerName"
            value={containerName}
            onChange={handleInputChange}
            placeholder="mailserver"
            helpText="settings.containerNameHelp"
            required
          />

          <Button type="submit" variant="primary" text="settings.saveButton" />
        </form>
      </Card>

      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          {t('settings.aboutDescription')}
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <strong>{t('settings.version')}:</strong> 1.0.0
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <a
            href="https://github.com/docker-mailserver/docker-mailserver"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline-primary"
              icon="github"
              text="settings.githubLink"
            />
          </a>
        </Card.Text>{' '}
        {/* Correct closing tag */}
      </Card>
    </div>
  );
};

export default Settings;
