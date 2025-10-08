import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  GroupColumnDef,
  useReactTable,
} from "@tanstack/react-table";

const columns: [
  columnHelper.accessor("show.name", {
    header: "Name",
    cell: (info) => info.getValue(),
    enableSorting: false, //disable sorting for this one
  }),
  columnHelper.accessor("show.type", {
    header: "Type",
    cell: (info) => info.getValue(),
  }),
];

export default function TanTable({ 
  columns,
  data,
  keyExtractor,
  isLoading= false,
  emptyMessage = 'common.noData',
  renderRow,
  striped = true, // Default to striped
  bordered = false,
  hover = false,
  responsive = true, // Default to responsive
  ...rest // Pass other props

}: TableProps<Show>) {
  
  // https://blog.logrocket.com/tanstack-table-formerly-react-table/
  // rename all instances of useTable to useReactTable
  // Column definitions now use accessorKey for strings and accessorFn for functions, 
  // Header has been renamed to header.
  // replacing cell.render('Cell') with flexRender()
  // manually defining props like colSpan and key
  // using getValue() instead of value for cell rendering
  
  const table = useReactTable({
    //pass in our data
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });
  
  
  // Table component logic and UI
  return (
    <>
    {/*Extra code to render table and logic..(removed for brevity)*/}
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            return (
              <th key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder ? null : (
                  <div
                    //when clicked, check if it can be sorted
                    //if it can, then sort this column
                    onClick={header.column.getToggleSortingHandler()}
                    title={
                      header.column.getCanSort()
                        ? header.column.getNextSortingOrder() === "asc"
                          ? "Sort ascending"
                          : header.column.getNextSortingOrder() === "desc"
                            ? "Sort descending"
                            : "Clear sort"
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{
                      //display a relevant icon for sorting order:
                      asc: " 🔼",
                      desc: " 🔽",
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
    </>
  );

}
