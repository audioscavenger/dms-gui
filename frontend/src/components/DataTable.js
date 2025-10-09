import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage'; // Import refactored AlertMessage
// https://www.npmjs.com/package/react-bootstrap
// https://react-bootstrap.netlify.app/docs/components/table/
import RBTable from 'react-bootstrap/Table';
// import "bootstrap-icons/font/bootstrap-icons.css";   // https://icons.getbootstrap.com/

/**
 * Reusable data table component using react-bootstrap
 * @param {Object} props Component props
 * @param {Array} props.columns Array of column definitions with {key, label, render?} objects
 * @param {Array} props.data Array of data objects to display
 * @param {function} props.keyExtractor Function to extract unique key from data item
 * @param {boolean} props.loading Whether data is loading
 * @param {string} props.emptyMessage Message to show when data is empty (translation key)
 * @param {function} props.renderRow Custom row rendering function (optional)
 * @param {boolean} props.striped Add striped styling
 * @param {boolean} props.bordered Add borders
 * @param {boolean} props.hover Enable hover state
 * @param {boolean|string} props.responsive Make table responsive ('sm', 'md', 'lg', 'xl', true)
 */
const DataTable = ({
  columns,
  data,
  keyExtractor,
  renderRow,
  sortKeys = [],
  isLoading= false,
  emptyMessage = 'common.noData',
  striped = true, // Default to striped
  bordered = false,
  hover = false,
  responsive = true, // Default to responsive
  ...rest // Pass other props to RBTable
}) => {
  const { t } = useTranslation();
  const [sortOrder, setSortOrder] = useState(0);
  
  const sortClick = (col) => {
    // we test the data type of the first row of that column
    // if (data.length > 1 && ['string','number'].includes(typeof data[0][col])) {
      setSortOrder(sortOrder === 0 ? 1 : 0);
      sortFunction(col);
    // }
  }
  
  const sortFunction = (col) => {
    console.debug(`ddebug sortOrder=${sortOrder} col=${col}`);
    console.debug('sortFunction, data=',data);
    console.debug('sortFunction, data[0][col]=',data[0][col]);
    
    // if columns is a dictionary
    if (typeof data[0][col] == 'object') {
      // find the first object in an array which exists in another array
      let sortKey = null;
      if (sortKeys) sortKey = Object.keys(data[0][col]).find((o2) => sortKeys.some((o1) => o1 == o2));
      
      // sort by the sortKey found
      if (sortKey) {
        console.debug('sortFunction, sortKey=',sortKey);
        if (parseInt(data[0][col][sortKey])) {
          if (sortOrder == 0) data.sort((a, b) => parseInt(a[col][sortKey]) - parseInt(b[col][sortKey]) );
          else                data.sort((b, a) => parseInt(a[col][sortKey]) - parseInt(b[col][sortKey]) );
        } else {
          if (sortOrder == 0) data.sort((a, b) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
          else                data.sort((b, a) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
        }

      // sort by the first key whatever it is
      } else {
        if (parseInt(Object.values(data[0][col])[0])) {
          if (sortOrder == 0) data.sort((a, b) => parseInt(Object.values(a[col])[0]) - parseInt(Object.values(b[col])[0]) );
          else                data.sort((b, a) => parseInt(Object.values(a[col])[0]) - parseInt(Object.values(b[col])[0]) );
        } else {
          if (sortOrder == 0) data.sort((a, b) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
          else                data.sort((b, a) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
        }
      }
      
    // or else stringify the data
    } else {
      if (parseInt(data[0][col])) {
        if (sortOrder == 0) data.sort((a, b) => parseInt(a[col]) - parseInt(b[col]) );
        else                data.sort((b, a) => parseInt(a[col]) - parseInt(b[col]) );
      } else {
        if (sortOrder == 0) data.sort((a, b) => JSON.stringify(a[col]).localeCompare(JSON.stringify(b[col])) );
        else                data.sort((b, a) => JSON.stringify(a[col]).localeCompare(JSON.stringify(b[col])) );
      }
    }
  }


  if (isLoading && !data) {
    return <LoadingSpinner />;
  }

  if (!data || data.length === 0) {
    // Use the refactored AlertMessage component
    return <AlertMessage type="info" message={emptyMessage} />;
  }


  return (
    <RBTable
      striped={striped}
      bordered={bordered}
      hover={hover}
      responsive={responsive}
      {...rest}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} onClick={() => sortClick(column.key)}>{t(column.label)}
            {(data[column.key] && sortOrder === 0) ? <i className="bi bi-arrow-up cursor-pointer"></i> : <i className="bi bi-arrow-down cursor-pointer"></i>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {renderRow
          ? data.map((item, index) => renderRow(item, index))
          : data.map((item) => (
              <tr key={keyExtractor(item)}>
                {columns.map((column) => (
                  <td key={`${keyExtractor(item)}-${column.key}`}>
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
    </RBTable>
  );
};

export default DataTable;
