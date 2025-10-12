const debug = false;
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';

// https://www.npmjs.com/package/react-bootstrap
// https://react-bootstrap.netlify.app/docs/components/table/
import RBTable from 'react-bootstrap/Table';
// import "bootstrap-icons/font/bootstrap-icons.css";   // https://icons.getbootstrap.com/

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }); // Note: no dependency array, so it runs on every render
  return ref.current;
}

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

  // import ChangeHighlight from 'react-change-highlight';
  // <ChangeHighlight>
    // warning: Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.
    // <td .. ref={React.createRef()}>

    // error: Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.
    // const ref = useRef([]);  
    // <td .. ref={(element)=> ref.current[index] = element}>

    // error: Uncaught Error: Expected ref to be a function, an object returned by React.createRef(), or undefined/null.
    // const ref = useRef<HTMLTableCellElement | null>([]);
    // <td .. ref={ref}>
  
  // To highlight changes in a React 19 table, you need to store the previous state of your data and compare it with the new data during rendering.
  // This can be accomplished using the useRef and useEffect hooks. The basic strategy is to maintain a reference to the data from the previous render cycle.
  // Method: Using useRef and useEffect
    // This is the standard approach for tracking previous values in React functional components. 
    // useRef creates a mutable object whose .current property persists across re-renders without causing a re-render when it changes.
  const previousData = usePrevious(data);

  
  // Column sorting click: we test the data type of the first row of that column
  // TODO: also hide the arrows for rendered columns as they have cirtually no data
  const sortClick = (col) => {
    // if (data.length > 1 && ['string','number'].includes(typeof data[0][col])) {
      setSortOrder(sortOrder === 0 ? 1 : 0);
      sortFunction(col);
    // }
  }
  
  const sortFunction = (col) => {
    if (debug) console.debug(`ddebug sortOrder=${sortOrder} col=${col}`);
    if (debug) console.debug('sortFunction, data=',data);
    if (debug) console.debug('sortFunction, data[0][col]=',data[0][col]);
    
    // if columns is a dictionary
    if (typeof data[0][col] == 'object') {
      // find the first object in an array which exists in another array
      let sortKey = null;
      if (sortKeys) sortKey = Object.keys(data[0][col]).find((o2) => sortKeys.some((o1) => o1 == o2));
      
      // sort by the sortKey found
      if (sortKey) {
        if (debug) console.debug('sortFunction, sortKey=',sortKey);
        if (Number(data[0][col][sortKey])) {
          if (sortOrder == 0) data.sort((a, b) => Number(a[col][sortKey]) - Number(b[col][sortKey]) );
          else                data.sort((b, a) => Number(a[col][sortKey]) - Number(b[col][sortKey]) );
        } else {
          if (sortOrder == 0) data.sort((a, b) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
          else                data.sort((b, a) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
        }

      // sort by the first key whatever it is
      } else {
        if (Number(Object.values(data[0][col])[0])) {
          if (sortOrder == 0) data.sort((a, b) => Number(Object.values(a[col])[0]) - Number(Object.values(b[col])[0]) );
          else                data.sort((b, a) => Number(Object.values(a[col])[0]) - Number(Object.values(b[col])[0]) );
        } else {
          if (sortOrder == 0) data.sort((a, b) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
          else                data.sort((b, a) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
        }
      }
      
    // or else stringify the data
    } else {
      if (Number(data[0][col])) {
        if (sortOrder == 0) data.sort((a, b) => Number(a[col]) - Number(b[col]) );
        else                data.sort((b, a) => Number(a[col]) - Number(b[col]) );
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
  <>
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
          : data.map((item, index) => {
              // Get the corresponding item from the previous data
              // Then later on, compare previousItem.value to item.value to detect a change and apply .highlight class
              // This works wonderfully, 
              const previousItem = previousData ? previousData[index] : null;
              
              return (
              <tr key={keyExtractor(item)}>
                {columns.map((column) => (
                  <td key={`${keyExtractor(item)}-${column.key}`} className={(previousItem && previousItem.value !== item.value) ? 'highlight-change' : ''}>
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
              );
          })}
      </tbody>
    </RBTable>
  </>
  );
};

export default DataTable;
