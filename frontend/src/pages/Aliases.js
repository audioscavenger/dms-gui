import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAliases,
  addAlias,
  deleteAlias,
  getAccounts,
} from '../services/api';
import {
  AlertMessage,
  Button,
  Card,
  DataTable,
  FormField,
  LoadingSpinner,
  SelectField,
} from '../components';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Aliases = () => {
  const { t } = useTranslation();
  const [aliases, setAliases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aliasesData, accountsData] = await Promise.all([
        getAliases(),
        getAccounts(),
      ]);
      setAliases(aliasesData);
      setAccounts(accountsData);
      setError(null);
    } catch (err) {
      console.error(t('api.errors.fetchAliases'), err);
      setError('api.errors.fetchAliases');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear the error for this field while typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.source.trim()) {
      errors.source = 'aliases.sourceRequired';
    } else if (!emailRegex.test(formData.source)) {
      errors.source = 'aliases.invalidSource';
    }

    if (!formData.destination.trim()) {
      errors.destination = 'aliases.destinationRequired';
    } else if (!emailRegex.test(formData.destination)) {
      errors.destination = 'aliases.invalidDestination';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      await addAlias(formData.source, formData.destination);
      setSuccessMessage('aliases.aliasCreated');
      setFormData({
        source: '',
        destination: '',
      });
      fetchData(); // Refresh the aliases list
    } catch (err) {
      console.error(t('api.errors.addAlias'), err);
      setError('api.errors.addAlias');
    }
  };

  const handleDelete = async (source, destination) => {
    if (window.confirm(t('aliases.confirmDelete', { source, destination }))) {
      try {
        await deleteAlias(source, destination);
        setSuccessMessage('aliases.aliasDeleted');
        fetchData(); // Refresh the aliases list
      } catch (err) {
        console.error(t('api.errors.deleteAlias'), err);
        setError('api.errors.deleteAlias');
      }
    }
  };

  // Column definitions for aliases table
  const columns = [
    { key: 'source', label: 'aliases.sourceAddress' },
    { key: 'destination', label: 'aliases.destinationAddress' },
    {
      key: 'actions',
      label: 'accounts.actions',
      render: (alias) => (
        <Button
          variant="danger"
          size="sm"
          icon="trash"
          onClick={() => handleDelete(alias.source, alias.destination)}
        />
      ),
    },
  ];

  // Prepare account options for the select field
  const accountOptions = accounts.map((account) => ({
    value: account.email,
    label: account.email,
  }));

  return (
    <div>
      <h2 className="mb-4">{t('aliases.title')}</h2>
      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={successMessage} />
      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={6} className="mb-4">
          {' '}
          {/* Use Col component */}
          <Card title="aliases.newAlias">
            {' '}
            {/* Removed mb-4 from Card, added to Col */}
            <form onSubmit={handleSubmit} className="form-wrapper">
              <FormField
                type="email"
                id="source"
                name="source"
                label="aliases.sourceAddress"
                value={formData.source}
                onChange={handleInputChange}
                placeholder="alias@domain.com"
                error={formErrors.source}
                helpText="aliases.sourceInfo"
                required
              />

              <SelectField
                id="destination"
                name="destination"
                label="aliases.destinationAddress"
                value={formData.destination}
                onChange={handleInputChange}
                options={accountOptions}
                placeholder="aliases.selectDestination"
                error={formErrors.destination}
                helpText="aliases.destinationInfo"
                required
              />

              <Button type="submit" variant="primary" text="aliases.addAlias" />
            </form>
          </Card>
        </Col>{' '}
        {/* Close first Col */}
        <Col md={6}>
          {' '}
          {/* Use Col component */}
          <Card title="aliases.existingAliases">
            <DataTable
              columns={columns}
              data={aliases}
              keyExtractor={(alias) => alias.source}
              loading={loading}
              emptyMessage="aliases.noAliases"
            />
          </Card>
        </Col>{' '}
        {/* Close second Col */}
      </Row>{' '}
      {/* Close Row */}
    </div>
  );
};

export default Aliases;
