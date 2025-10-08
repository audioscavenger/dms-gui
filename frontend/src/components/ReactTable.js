import React from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage'; // Import refactored AlertMessage
import RBTable from 'react-bootstrap/Table'; // Import react-bootstrap Table

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
  loading = false,
  emptyMessage = 'common.noData',
  renderRow,
  striped = true, // Default to striped
  bordered = false,
  hover = false,
  responsive = true, // Default to responsive
  ...rest // Pass other props to RBTable
}) => {
  const { t } = useTranslation();

  if (loading) {
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
            <th key={column.key}>{t(column.label)}</th>
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
