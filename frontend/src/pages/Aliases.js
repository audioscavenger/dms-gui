const debug = false;
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
  const [isLoading, setLoading] = useState(true);
  
  const [aliases, setAliases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAliases(false);
  }, []);

  const fetchAliases = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    if (debug) console.debug(`ddebug: ------------- fetchAliases call getAliases(${refresh}) and getAccounts(false)`);
    
    try {
      setLoading(true);
      const [aliasesData, accountsData] = await Promise.all([
        getAliases(refresh),
        getAccounts(false),
      ]);
      setAccounts(accountsData);
      setAliases(aliasesData);
      setErrorMessage(null);

      // if (debug) console.debug('ddebug: ------------- aliasesData', aliasesData);

    } catch (err) {
      console.error(t('api.errors.fetchAliases'), err);
      setErrorMessage('api.errors.fetchAliases');
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
    setErrorMessage(null);
    setSuccessMessage(null);

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
      // if (debug) console.debug('ddebug: ------------- call fetchAliases(true)');
      fetchAliases(true); // Refresh the aliases list
    } catch (err) {
      console.error(t('api.errors.addAlias'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addAlias');
    }
  };

  const handleDelete = async (source, destination) => {
    if (window.confirm(t('aliases.confirmDelete', { source, destination }))) {
      try {
        await deleteAlias(source, destination);
        setSuccessMessage('aliases.aliasDeleted');
        // if (debug) console.debug('ddebug: ------------- call fetchAliases(true)');
        fetchAliases(true); // Refresh the aliases list
      } catch (err) {
        console.error(t('api.errors.deleteAlias'), err);
        (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.deleteAlias');
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


  if (isLoading && !aliases.length) {
    return <LoadingSpinner />;
  }
  
  const howMany = `(${aliases.length})`;
  
  return (
    <div>
      <h2 className="mb-4">{t('aliases.title')}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={5} className="mb-4">
          {' '}
          {/* Use Col component */}
          <Card title="aliases.newAlias" icon="person-plus-fill">
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

              <Button type="submit" variant="primary" text="aliases.addAlias" collapse="true"/>
            </form>
          </Card>
        </Col>{' '}
        {/* Close first Col */}
        <Col md={7}>
          {' '}
          {/* Use Col component */}
          <Card 
            title="aliases.existingAliases" 
            titleExtra={howMany} 
            icon="person-lines-fill" 
            onClickRefresh={() => fetchAliases(true)}
          >
            <DataTable
              columns={columns}
              data={aliases}
              keyExtractor={(alias) => alias.source}
              isLoading={isLoading}
              emptyMessage="aliases.noAliases"
              hover="true"
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
