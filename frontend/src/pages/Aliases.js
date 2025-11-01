import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  pluck,
} = require('../../frontend');

import {
  getAccounts,
  getAliases,
  addAlias,
  deleteAlias,
} from '../services/api';

import {
  AlertMessage,
  Button,
  Card,
  DataTable,
  FormField,
  LoadingSpinner,
  SelectField,
  Translate,
} from '../components';

const Aliases = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  
  const [aliases, setAliases] = useState([]);
  const [isSource, setIsSource] = useState({valid:true, alias:true});
  const [accounts, setAccounts] = useState([]);
  
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
  });
  const [formErrors, setFormErrors] = useState({});

  /* 
  TODO: useEffect properly on object change
  const parentObject = useMemo(() => ({
    prop: 'value'
  }), []); // Empty array ensures the object reference is stable

  const handleSubmit = useCallback(() => {
    // The function reference is stable
  }, []);

  useEffect(() => {
    // This will now only re-run if parentObject actually changes
  }, [parentObject]);
   */
  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAliases(false);
  }, []);

  const fetchAliases = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    debugLog(`fetchAliases call getAliases(${refresh}) and getAccounts(false)`);
    
    try {
      setLoading(true);
      const [aliasesData, accountsData] = await Promise.all([
        getAliases(refresh),
        getAccounts(refresh),
      ]);
      setAccounts(accountsData);
      
      // add color column for regex aliases
      let aliasesDataFormatted = aliasesData.map(alias => { return { 
        ...alias, 
        source: (alias.regex) ? JSON.parse(alias.source) : alias.source,
        color:  (alias.regex) ? "text-info" : "",
        }; });
      setAliases(aliasesDataFormatted);
      
      setErrorMessage(null);

      debugLog('aliasesDataFormatted', aliasesDataFormatted); // [ { source: 'a@b.com', destination:'b@b.com', regex: 0, color: '' }, .. ]
      debugLog('accountsData', accountsData);                 // [ { mailbox: 'a@a.com', domain:'a.com', storage: {} },{ mailbox: 'b@b.com', domain:'b.com', storage: {} }, .. ]

    } catch (err) {
      errorLog(t('api.errors.fetchAliases'), err);
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
    
    
    if (name == 'source') {
      console.debug('value.match(regexEmailStrict)',value.match(regexEmailStrict));
      console.debug('value.match(regexEmailRegex)',value.match(regexEmailRegex));
      setIsSource({
        alias: value.trim().match(regexEmailStrict),
        valid: value.trim().match(regexEmailStrict) || value.trim().match(regexEmailRegex),
      });
    }

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
    
    // with FormField type="text" we don;t need any of that, but since we deal with regex...
    
    let matchEmailStrict = formData.source.trim().match(regexEmailStrict);
    let matchEmailRegex = formData.source.trim().match(regexEmailRegex);
    console.debug('matchEmailStrict',matchEmailStrict)
    console.debug('matchEmailRegex',matchEmailRegex)

    if (!formData.source.trim()) {
      errors.source = 'aliases.sourceRequired';
    } else if (!matchEmailStrict && !matchEmailRegex) {
      errors.source = 'aliases.invalidSource';
    }

    if (!formData.destination.trim()) {
      errors.destination = 'aliases.destinationRequired';
    }

    // Also test if source domain exist in domains when it's a mailbox match
    // I can't see how to test for regex as the domain part can be regex too
    if (matchEmailStrict && !pluck(accounts, 'domain').includes(matchEmailStrict[2])) {
      errors.source = 'aliases.invalidSourceDomain';
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
      const result = await addAlias(formData.source.trim(), formData.destination.trim());
      if (result.success) {
        setFormData({
          source: '',
          destination: '',
        });
        fetchAliases(true); // Refresh the aliases list
        setSuccessMessage('aliases.aliasCreated');
        
      } else setErrorMessage(result.message);
      
    } catch (err) {
      errorLog(t('api.errors.addAlias'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addAlias');
    }
  };

  const handleDelete = async (source, destination) => {
    if (window.confirm(t('aliases.confirmDelete', { source }))) {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      try {
        const result = await deleteAlias(source, destination);
        if (result.success) {
          fetchAliases(true); // Refresh the aliases list
          setSuccessMessage('aliases.aliasDeleted');
          
        } else setErrorMessage(result.message);
        
      } catch (err) {
        errorLog(t('api.errors.deleteAlias'), err);
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
      label: 'common.actions',
      noSort: true,
      noFilter: true,
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
    value: account.mailbox,
    label: account.mailbox,
  }));


  if (isLoading && !aliases && !aliases.length) {
    return <LoadingSpinner />;
  }
  
  const howMany = `(${aliases.length})`;
  
  return (
    <div>
      <h2 className="mb-4">{Translate('aliases.title')}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Row>
        {' '}
        {/* Use Row component */}
        <Col md={5} className="mb-4">
          {' '}
          {/* Use Col component */}
          <Card title="aliases.newAlias" icon="person-plus-fill">{' '}
            {/* Removed mb-4 from Card, added to Col */}
            <form onSubmit={handleSubmit} className="form-wrapper">
              <FormField
                type="text"
                id="source"
                name="source"
                label={isSource?.valid ? (isSource?.alias ? "aliases.sourceAlias" : "aliases.sourceRegex") : "aliases.sourceRequired"}
                labelColor={isSource?.valid ? (isSource?.alias ? "" : "text-info") : "text-danger"}
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
        <Col md={7}>
          {' '}
          {/* Use Col component */}
          <Card 
            title="aliases.existingAliases" 
            titleExtra={howMany} 
            icon="person-lines-fill" 
            isLoading={isLoading}
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
