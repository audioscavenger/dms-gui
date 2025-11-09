// https://icons.getbootstrap.com/
// https://www.npmjs.com/package/react-bootstrap
// https://react-bootstrap.netlify.app/docs/components/table/
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Table, Form } from 'react-bootstrap';
// import { useTranslation } from 'react-i18next';

import {
  debugLog,
} from '../../frontend';

import {
  LoadingSpinner,
  AlertMessage,
  Translate,
} from '.';

/**
 * Reusable data table component using react-bootstrap
 * @param {Object} props Component props
 * @param {Array} props.columns Array of column definitions with {key, label, noSort, noFilter, render?} objects
 * @param {Array} props.data Array of data objects to display
 * @param {function} props.keyExtractor Function to extract unique key from data item
 * @param {boolean} props.loading Whether data is loading
 * @param {string} props.emptyMessage Message to show when data is empty (translation key)
 * @param {function} props.renderRow Custom row rendering function (optional)
 * @param {boolean} props.striped Add striped styling
 * @param {boolean} props.bordered Add borders
 * @param {boolean} props.hover Enable hover state
 * @param {boolean|string} props.responsive Make table responsive ('sm', 'md', 'lg', 'xl', true)
 * @param {boolean} props.translate uses Translate or not
 * @param {boolean} props.noSort disable sorting entirely
 * @param {boolean} props.noFilter disable filtering entirely
 */
const DataTable = ({
  columns,
  data,                   // adding a color column will apply that class to each row tr
  keyExtractor,
  renderRow,
  sortKeysInObject = [],  // we will sort objects from data only by those keys
  isLoading= false,
  emptyMessage = 'common.noData',
  striped = true,         // Default to striped
  bordered = false,
  hover = false,
  responsive = true,      // Default to responsive
  translate = true,
  noSort = false,
  noFilter = false,
  ...rest // Pass other props to Table
}) => {
  // const { t } = useTranslation();
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrders, setSortOrders] = useState({});       // { columnName: 0|1 }
  const [columnFilters, setColumnFilters] = useState({}); // { columnName: 'filterValue' }

  const sortFunction = (col, currentData=[]) => {
    // we escape if currentData[0][col] is null == it's a rendered column; both data and currentData columns are null when rendered
    // debugLog(`sortFunction, currentData[0]=`, currentData[0]);                                              // { username: "admin", email: null, ..}
    // debugLog(`sortFunction, currentData[0][${col}] (${typeof currentData[0][col]})=`, currentData[0][col]); // null for email column that is rendering a FormField inside a div
    
    // checking for currentData[0][col] not undefined helps not crashing the sort algorithm
    if (currentData.length && currentData[0][col] != undefined) {
      // debugLog(`ddebug sortFunction col=${col} sortOrders=`,sortOrders);
      // debugLog('ddebug sortFunction currentData=',currentData);

      // if currentData[0][col] is a dictionary
      if (typeof currentData[0][col] == 'object') {
        // find the first object in an array which exists in another array
        let sortKey = null;
        // we will filter object data only if a key from this data object was passed
        if (sortKeysInObject) sortKey = Object.keys(currentData[0][col]).find((o2) => sortKeysInObject.some((o1) => o1 == o2));
        
        // sort by the sortKey found
        if (sortKey) {
          debugLog('sortFunction, sortKey=',sortKey);
          if (Number(currentData[0][col][sortKey])) {
            if (sortOrders[col] == 0) currentData.sort((a, b) => Number(a[col][sortKey]) - Number(b[col][sortKey]) );
            else                      currentData.sort((b, a) => Number(a[col][sortKey]) - Number(b[col][sortKey]) );
          } else {
            if (sortOrders[col] == 0) currentData.sort((a, b) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
            else                      currentData.sort((b, a) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
          }

        // optional: try and sort by the first key of object, whatever it is
        } else {
          if (Number(Object.values(currentData[0][col])[0])) {
            if (sortOrders[col] == 0) currentData.sort((a, b) => Number(Object.values(a[col])[0]) - Number(Object.values(b[col])[0]) );
            else                      currentData.sort((b, a) => Number(Object.values(a[col])[0]) - Number(Object.values(b[col])[0]) );
          } else {
            if (sortOrders[col] == 0) currentData.sort((a, b) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
            else                      currentData.sort((b, a) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
          }
        }
        
      // or else stringify/number compare the currentData
      } else {
        if (Number(currentData[0][col])) {
          if (sortOrders[col] == 0) currentData.sort((a, b) => Number(a[col]) - Number(b[col]) );
          else                      currentData.sort((b, a) => Number(a[col]) - Number(b[col]) );
        } else {
          if (sortOrders[col] == 0) currentData.sort((a, b) => JSON.stringify(a[col]).localeCompare(JSON.stringify(b[col])) );
          else                      currentData.sort((b, a) => JSON.stringify(a[col]).localeCompare(JSON.stringify(b[col])) );
        }
      }
    } // not a rendered column
  }

   function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }); // Note: no dependency array, so it runs on every render
    return ref.current;
  }

  const handleSort = (column) => {
    debugLog(`columns=`,columns);
    if (column in sortOrders) { debugLog(`!!!${column} IN  (=${sortColumn}?)`,sortOrders);} else debugLog(`!!!${column} NOT (=${sortColumn}?`, sortOrders);
    if (sortColumn === column) {
      debugLog(`>>>setSortOrders for ${column} from ${sortOrders[column]} to`,+(!sortOrders[column]));
      setSortOrders({ ...sortOrders, [column]: +(!sortOrders[column]) });  // flip bit 0 <-> 1
    } else {
      debugLog(`---setSortOrders for ${column} to 0 (sortColumn=${sortColumn})`);
      setSortColumn(column);
      setSortOrders({ ...sortOrders, [column]: 0 });
    }
    debugLog(`^^^final content of sortOrders:`,sortOrders); // never shows updated values
  };

  const handleFilterChange = (column, value) => {
    setColumnFilters({ ...columnFilters, [column]: value });
  };

  // BUG: crash when filtering objects: right-hand side of 'in' should be an object, got undefined
  const sortedAndFilteredData = useMemo(() => {
    let currentData = [...data];
    // debugLog(`currentData before sortedAndFilteredData`, currentData);
    // debugLog(`                   columnFilters`,columnFilters);

    // Apply columnFilters?
    Object.keys(columnFilters).forEach((column) => {
      const filterValue = columnFilters[column].toLowerCase();
      if (filterValue) {
        currentData = currentData.filter((row) =>
          String(row[column]).toLowerCase().includes(filterValue)
        );
      }
    });

    // Apply sorting ? '▲' : '▼'
    if (currentData.length && sortColumn) {
      debugLog(`currentData before sortColumn=${sortColumn}`, currentData);
      // works:
      sortFunction(sortColumn, currentData);
    }
    
    // debugLog(`currentData after  sortColumn=${sortColumn}`, currentData);
    return currentData;
  }, [data, sortColumn, sortOrders, columnFilters]);

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


  if (isLoading && !data.length) {
    return <LoadingSpinner />;
  };

  if (!data || data.length === 0) {
    // Use the refactored AlertMessage component
    return <AlertMessage type="info" message={emptyMessage} />;
  }

  // TODO: since we handle object columns, find a way to hide sort arrows span for rendered columns name are not in sortedAndFilteredData
  // BUG:  (column.key in sortedAndFilteredData[0]) should be false for rendered columns keys not in sortedAndFilteredData but it's always true for some reason
  // BUG:  hide the sorting arrows for rendered columns without data: column.key in sortedAndFilteredData[0] comes first!
  // BUG:  opacity applied to the row also affect the buttons, solution is the wrap the text in a <span> and tweak the opacity class to affect td span only
  // BUG:  fixed arrows not flipping on first click by removing !(column.key in sortOrders)
  
  return (
    <>
    <Table
      striped={striped}
      bordered={bordered}
      hover={hover}
      responsive={responsive}
      {...rest}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th 
              key={column.key} 
            >
            {Translate(column.label)}
            <span className='cursor-pointer' onClick={() => handleSort(column.key)}>
            {((!noSort && sortedAndFilteredData.length && column.key in sortedAndFilteredData[0] && !column?.noSort)
               && ((sortOrders[column.key] === 0 ) ? '▲' : '▼') || ""
            )}
            </span>
            <Form.Control className={(!noFilter && column?.noFilter) ? "form-control-sm invisible w-0" : "form-control-sm"} type="text" placeholder={column.key} onChange={(e) => handleFilterChange(column.key, e.target.value)}
            />
            </th>
          ))}
        </tr>
      </thead>
      
      <tbody>
        {renderRow
          ? sortedAndFilteredData.map((item, index) => renderRow(item, index))
          : sortedAndFilteredData.map((item, index) => {
              // Get the corresponding item from the previous filteredData
              // Then later on, compare previousItem.value to item.value to detect a change and apply .highlight class
              // const previousItem = previousData ? previousData[index] : null;
              const previousItem = null;
              
              return (
              <tr key={keyExtractor(item)} className={item?.color}>
                {columns.map((column) => (
                  <td key={`${keyExtractor(item)}-${column.key}`} className={(previousItem && previousItem.value !== item.value) ? "highlight-change" : ""}>
                    {column.render ? column.render(item) : <span>{item[column.key]}</span>}
                  </td>
                ))}
              </tr>
              );
          })}
      </tbody>
      
    </Table>
    </>
  );
}

export default DataTable;

/*
useEffect hook has 3ways to use.

  runs once when the component will be rendered:
   useEffect(()=>{
       // your code
   },[])

  runs everytime when these x1,x2,... dependencies have been chaged:
   useEffect(()=>{
   // your code
   },[x1,x2,...])

  runs after updating anything and also on rendering the component:
    useEffect(()=>{
   // your code
    })


*/
