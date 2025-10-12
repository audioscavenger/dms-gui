const debug = true;
// https://www.npmjs.com/package/react-bootstrap
// https://react-bootstrap.netlify.app/docs/components/table/
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Table, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';
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
  ...rest // Pass other props to Table
}) => {
  const { t } = useTranslation();
  const [liveData, setLiveData] = useState(data);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  useEffect(() => {
    // handleSort(columns[0].key);
    // setSortColumn(columns[0].key);
    // setLiveData(data);   // never works
  }, []);



  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }); // Note: no dependency array, so it runs on every render
    return ref.current;
  }


  // Filtered liveData based on current filters
  const filteredData = useMemo(() => {
    let currentData = [...liveData];
    Object.keys(filters).forEach(columnKey => {
      const filterValue = filters[columnKey].toLowerCase();
      if (filterValue) {
        currentData = currentData.filter(row =>
          String(row[columnKey]).toLowerCase().includes(filterValue)
        );
      }
    });
    return currentData;
  }, [liveData, filters]);

  // Sorted liveData based on current sort config
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      // Handle other liveData types (numbers, dates) here
      return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredData, sortConfig]);

  const handleFilterChange = (columnKey, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [columnKey]: value }));
  };

  const handleSort = (columnKey) => {
    let direction = 'ascending';
    if (sortConfig.key === columnKey && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key: columnKey, direction });
  };

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


  if (isLoading && !data) {
    return <LoadingSpinner />;
  };

  if (!data || data.length === 0) {
    // Use the refactored AlertMessage component
    return <AlertMessage type="info" message={emptyMessage} />;
  }


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
            <div className='cursor-pointer' onClick={() => handleSort(column.key)}> 
            {t(column.label)}
            {(sortConfig && sortConfig.key === column.key) && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</div>
            <Form.Control type="text" placeholder={column.key} value={filters[column.key] || ''} onChange={(e) => handleFilterChange(column.key, e.target.value)}
            />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {renderRow
          ? sortedData.map((item, index) => renderRow(item, index))
          : sortedData.map((item, index) => {
              // Get the corresponding item from the previous filteredData
              // Then later on, compare previousItem.value to item.value to detect a change and apply .highlight class
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
    </Table>
    </>
  );
}

export default DataTable;

/*
const debug = true;
// https://www.npmjs.com/package/react-bootstrap
// https://react-bootstrap.netlify.app/docs/components/table/
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Table, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';
// import "bootstrap-icons/font/bootstrap-icons.css";   // https://icons.getbootstrap.com/
*/

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
 /*
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
  ...rest // Pass other props to Table
}) => {
  const { t } = useTranslation();
  const [liveData, setLiveData] = useState(data);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrders, setSortOrders] = useState({});       // { columnName: 0|1 }
  const [columnFilters, setColumnFilters] = useState({}); // { columnName: 'filterValue' }

  useEffect(() => {
    // handleSort(columns[0].key);
    // setSortColumn(columns[0].key);
    // setLiveData(data);   // never works
  }, []);

  function showSort(column) {
    if (sortColumn) {
      if (sortColumn === column) return (sortOrders === 0) ? '▲' : '▼';
    } else return '▲';
  }

  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }); // Note: no dependency array, so it runs on every render
    return ref.current;
  }

  // TODO: store column: 0|1 in sortColumn and use ({ ...sortOrders, [column]: sort }); or smth like that
  const handleSort = (column) => {
    if (column in sortOrders) { if (debug) console.debug(`!!!${column} IN  (=${sortColumn}?)`,sortOrders);} else if (debug) console.debug(`!!!${column} NOT (=${sortColumn}?`,sortOrders);
    if (sortColumn === column) {
      if (debug) console.debug(`>>>setSortOrders for ${column} from ${sortOrders[column]} to`,+(!sortOrders[column]));
      setSortOrders({ ...sortOrders, [column]: +(!sortOrders[column]) });  // flip bit 0 <-> 1
    } else {
      setSortColumn(column);
      setSortOrders({ ...sortOrders, [column]: 0 });
      // for (const key in sortOrders) {
        // if (key !== column) {
          // if (debug) console.debug(`---setSortOrders for ${key} to 0`);
          // setSortOrders({ ...sortOrders, [key]: 0 });
        // }
      // }
    }
    if (debug) console.debug(`^^^final content of sortOrders:`,sortOrders); // never shows updated values
  };

  const handleFilterChange = (column, value) => {
    setColumnFilters({ ...columnFilters, [column]: value });
  };

  const sortedAndFilteredData = useMemo(() => {
    let currentData = [...data];
    if (debug) console.debug(`currentData before sortedAndFilteredData`,JSON.stringify(currentData));
    // if (debug) console.debug(`                   columnFilters`,columnFilters);

    // Apply columnFilters
    Object.keys(columnFilters).forEach((column) => {
      const filterValue = columnFilters[column].toLowerCase();
      if (filterValue) {
        currentData = currentData.filter((row) =>
          String(row[column]).toLowerCase().includes(filterValue)
        );
      }
    });

    // Apply sorting ? '▲' : '▼'
    if (sortColumn) {
      if (debug) console.debug(`currentData before sortColumn=${sortColumn}`,JSON.stringify(currentData));
      currentData.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (aValue < bValue) return +(!sortOrders[sortColumn]);   // flip bit 0 <-> 1
        if (aValue > bValue) return +(!sortOrders[sortColumn]);   // flip bit 0 <-> 1
        return 0;
      });
    }

      // if (Object.keys(data).length) {
        // // init sortOrders
        // if (debug) console.debug(`              -- init sortOrders --`);
        // let resetSort = {};
        // for (const key in data[0]) {
          // if (debug) console.debug(`---setSortOrders for ${key} to 0`);
          // resetSort[key] = 0;
        // }
        // setSortOrders(resetSort);
        // // setSortColumn(columns[0].key);
      // }

    
    if (debug) console.debug(`currentData after  sortColumn=${sortColumn}`,JSON.stringify(currentData));
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
  const previousData = usePrevious(sortedAndFilteredData);


  if (isLoading && !data) {
    return <LoadingSpinner />;
  };

  if (!data || data.length === 0) {
    // Use the refactored AlertMessage component
    return <AlertMessage type="info" message={emptyMessage} />;
  }


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
            {t(column.label)}
            <span className='cursor-pointer' onClick={() => handleSort(column.key)}> { ((sortColumn === column.key) && (!(column.key in sortOrders) || sortOrders[column.key] === 0) ? '▲' : '▼')}</span>
            <Form.Control type="text" placeholder={column.key} onChange={(e) => handleFilterChange(column.key, e.target.value)}
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
      
    </Table>
    </>
  );
}

export default DataTable;
*/

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


/*
  // Column sorting click: we test the data type of the first row of that column
  // TODO: also hide the arrows for rendered columns as they have cirtually no data
  const sortClick = (col) => {
    // if (data.length > 1 && ['string','number'].includes(typeof data[0][col])) {
      setSortOrders(sortOrders === 0 ? 1 : 0);
      sortFunction(col);
    // }
  }
  
  
  const sortFunction = (col) => {
    if (debug) console.debug(`ddebug sortOrders=${sortOrders} col=${col}`);
    if (debug) console.debug('sortFunction, filteredData=',filteredData);
    if (debug) console.debug(`sortFunction, filteredData[0][${col}]=`,filteredData[0][col]);
    
    // if columns is a dictionary
    if (typeof filteredData[0][col] == 'object') {
      // find the first object in an array which exists in another array
      let sortKey = null;
      if (sortKeys) sortKey = Object.keys(filteredData[0][col]).find((o2) => sortKeys.some((o1) => o1 == o2));
      
      // sort by the sortKey found
      if (sortKey) {
        if (debug) console.debug('sortFunction, sortKey=',sortKey);
        if (Number(filteredData[0][col][sortKey])) {
          if (sortOrders == 0) filteredData.sort((a, b) => Number(a[col][sortKey]) - Number(b[col][sortKey]) );
          else                filteredData.sort((b, a) => Number(a[col][sortKey]) - Number(b[col][sortKey]) );
        } else {
          if (sortOrders == 0) filteredData.sort((a, b) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
          else                filteredData.sort((b, a) => JSON.stringify(a[col][sortKey]).localeCompare(JSON.stringify(b[col][sortKey])) );
        }

      // sort by the first key whatever it is
      } else {
        if (Number(Object.values(filteredData[0][col])[0])) {
          if (sortOrders == 0) filteredData.sort((a, b) => Number(Object.values(a[col])[0]) - Number(Object.values(b[col])[0]) );
          else                filteredData.sort((b, a) => Number(Object.values(a[col])[0]) - Number(Object.values(b[col])[0]) );
        } else {
          if (sortOrders == 0) filteredData.sort((a, b) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
          else                filteredData.sort((b, a) => JSON.stringify(Object.values(a[col])[0]).localeCompare(JSON.stringify(Object.values(b[col])[0])) );
        }
      }
      
    // or else stringify the filteredData
    } else {
      if (Number(filteredData[0][col])) {
        if (sortOrders == 0) filteredData.sort((a, b) => Number(a[col]) - Number(b[col]) );
        else                filteredData.sort((b, a) => Number(a[col]) - Number(b[col]) );
      } else {
        if (sortOrders == 0) filteredData.sort((a, b) => JSON.stringify(a[col]).localeCompare(JSON.stringify(b[col])) );
        else                filteredData.sort((b, a) => JSON.stringify(a[col]).localeCompare(JSON.stringify(b[col])) );
      }
    }
  }
*/


// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// original code I tried to implement: --------------------------------------------------------------------------------------------------------------
// https://www.google.com/search?q=add+column+filtering+and+sorting+together+to+react-bootstrap%2FTable+without+react-bootstrap-table2&num=10&client=firefox-b-1-d&sca_esv=650ecf1b08cfc5b0&sxsrf=AE3TifMpc7ozvdPpdtFtz2VKxC95p4o23Q%3A1760295362942&ei=wvnraNmtOdrHkPIPtbXtwQ4&ved=0ahUKEwjZlrueq5-QAxXaI0QIHbVaO-gQ4dUDCBA&uact=5&oq=add+column+filtering+and+sorting+together+to+react-bootstrap%2FTable+without+react-bootstrap-table2&gs_lp=Egxnd3Mtd2l6LXNlcnAiYWFkZCBjb2x1bW4gZmlsdGVyaW5nIGFuZCBzb3J0aW5nIHRvZ2V0aGVyIHRvIHJlYWN0LWJvb3RzdHJhcC9UYWJsZSB3aXRob3V0IHJlYWN0LWJvb3RzdHJhcC10YWJsZTJI7DBQiAdYrC9wAXgBkAEAmAFLoAHcAqoBATa4AQPIAQD4AQGYAgGgAgbCAgoQABiwAxjWBBhHmAMAiAYBkAYIkgcBMaAHsAyyBwC4BwDCBwMyLTHIBwM&sclient=gws-wiz-serp

/*
import React, { useState, useEffect, useMemo } from 'react';
import { Table, Form } from 'react-bootstrap';

function MySortableFilterableTable({ initialData }) {
  const [data, setLiveData] = useState(initialData);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Filtered data based on current filters
  const filteredData = useMemo(() => {
    let currentData = [...data];
    Object.keys(filters).forEach(columnKey => {
      const filterValue = filters[columnKey].toLowerCase();
      if (filterValue) {
        currentData = currentData.filter(row =>
          String(row[columnKey]).toLowerCase().includes(filterValue)
        );
      }
    });
    return currentData;
  }, [data, filters]);

  // Sorted data based on current sort config
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      // Handle other data types (numbers, dates) here
      return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredData, sortConfig]);

  const handleFilterChange = (columnKey, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [columnKey]: value }));
  };

  const handleSort = (columnKey) => {
    let direction = 'ascending';
    if (sortConfig.key === columnKey && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key: columnKey, direction });
  };

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>
            <div onClick={() => handleSort('name')}>
              Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
            </div>
            <Form.Control
              type="text"
              placeholder="Filter Name"
              value={filters.name || ''}
              onChange={(e) => handleFilterChange('name', e.target.value)}
            />
          </th>
          <th>
            <div onClick={() => handleSort('age')}>
              Age {sortConfig.key === 'age' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
            </div>
            <Form.Control
              type="text"
              placeholder="Filter Age"
              value={filters.age || ''}
              onChange={(e) => handleFilterChange('age', e.target.value)}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, index) => (
          <tr key={index}>
            <td>{row.name}</td>
            <td>{row.age}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
*/