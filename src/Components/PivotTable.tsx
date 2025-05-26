import React, { useMemo, useState, useRef, useEffect } from 'react';
import './PivotTable.scss';

interface PivotDataItem {
  row_header_input: string;
  col_header_input: string;
  Value_formatted: string;
  Cell_id: string;
  _data_point_ltrb: [number, number, number, number];
  Value?: number;
  page?: number;
}

interface PivotTableProps {
  data: { data: PivotDataItem[] }[];
  onCellClick?: (cellId: string, ltrb: [number, number, number, number], values: PivotDataItem[]) => void;
}

const PivotTable: React.FC<PivotTableProps> = ({ data, onCellClick }) => {
  const [sortField, setSortField] = useState<string>('row_header_input');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dropdownCell, setDropdownCell] = useState<{
    cellId: string;
    row: string;
    col: string;
    values: PivotDataItem[];
    top: number;
    left: number;
  } | null>(null);
  const [validatedCells, setValidatedCells] = useState<{ [cellId: string]: boolean }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // Process data to create pivot structure
  const pivotData = useMemo(() => {
    const flatData = data[0]?.data || [];
    
    // Log raw data for debugging
    console.log('Raw flatData:', flatData);

    // Extract unique rows and columns
    const rows = Array.from(new Set(flatData.map(item => item.row_header_input))).sort();
    const columns = Array.from(new Set(flatData.map(item => item.col_header_input))).sort();

    // Aggregate values and track multiple items
    const aggregated: {
      [row: string]: {
        [col: string]: {
          value: number;
          cellId: string;
          formatted: string;
          ltrb: [number, number, number, number];
          items: PivotDataItem[];
        };
      };
    } = {};
    
    flatData.forEach(item => {
      const row = item.row_header_input;
      const col = item.col_header_input;
      const valueStr = item.Value_formatted?.replace(/[^\d.-]/g, '') || '0';
      const value = parseFloat(valueStr) || 0;
      
      if (!aggregated[row]) {
        aggregated[row] = {};
      }
      if (!aggregated[row][col]) {
        aggregated[row][col] = {
          value: 0,
          cellId: item.Cell_id,
          formatted: '',
          ltrb: item._data_point_ltrb,
          items: [],
        };
      }
      aggregated[row][col].value += value;
      aggregated[row][col].formatted = `€${aggregated[row][col].value.toLocaleString()}`;
      // Ensure unique items by Cell_id
      if (!aggregated[row][col].items.some(existing => existing.Cell_id === item.Cell_id)) {
        aggregated[row][col].items.push({ ...item });
      }
    });

    // Log aggregated items for debugging
    Object.keys(aggregated).forEach(row => {
      Object.keys(aggregated[row]).forEach(col => {
        console.log(`Cell [${row}, ${col}] items:`, aggregated[row][col].items);
      });
    });

    return { rows, columns, aggregated };
  }, [data]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...pivotData.rows].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      return a.localeCompare(b) * dir;
    });
  }, [pivotData.rows, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle button click for multiple values
  const handleButtonClick = (
    row: string,
    col: string,
    cellData: { cellId: string; ltrb: [number, number, number, number]; items: PivotDataItem[] },
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    const cell = cellRefs.current.get(`${row}-${col}`);
    if (cell) {
      const rect = cell.getBoundingClientRect();
      setDropdownCell({
        cellId: cellData.cellId,
        row,
        col,
        values: cellData.items,
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
      });
    }
  };

  // Handle cell click for single values
  const handleCellClick = (
    row: string,
    col: string,
    cellData: { cellId: string; ltrb: [number, number, number, number]; items: PivotDataItem[] },
    event: React.MouseEvent<HTMLTableCellElement>
  ) => {
    event.stopPropagation();
    if (cellData.items.length === 1) {
      setDropdownCell(null);
      onCellClick?.(cellData.cellId, cellData.ltrb, cellData.items);
    }
  };

  // Handle validation toggle
  const handleValidationToggle = (cellId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setValidatedCells(prev => ({
      ...prev,
      [cellId]: event.target.checked,
    }));
  };

  // Handle dropdown item click
  const handleDropdownItemClick = (item: PivotDataItem, event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onCellClick?.(item.Cell_id, item._data_point_ltrb, [item]);
    setDropdownCell(null);
  };

  // Check if all items in a cell are validated
  const areAllItemsValidated = (items: PivotDataItem[]) => {
    return items.length > 0 && items.every(item => validatedCells[item.Cell_id] === true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.multiple-indicator')
      ) {
        setDropdownCell(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="pivot-table-container">
      <table className="pivot-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('row_header_input')}>
              Company {sortField === 'row_header_input' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </th>
            {pivotData.columns.map(col => (
              <th key={col} onClick={() => handleSort(col)}>
                {col} {sortField === col ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => (
            <tr key={row}>
              <td>{row}</td>
              {pivotData.columns.map(col => {
                const cellData = pivotData.aggregated[row]?.[col];
                const hasValue = cellData && cellData.formatted !== '-';
                const isMultiple = cellData && cellData.items.length > 1;
                const allValidated = isMultiple && areAllItemsValidated(cellData.items);
                
                return (
                  <td
                    key={`${row}-${col}`}
                    ref={(el) => {
                      if (el) {
                        cellRefs.current.set(`${row}-${col}`, el);
                      } else {
                        cellRefs.current.delete(`${row}-${col}`);
                      }
                    }}
                    onClick={(e) => cellData && handleCellClick(row, col, cellData, e)}
                    className={`data-cell ${hasValue ? (isMultiple && !allValidated ? 'multiple-values' : 'single-value') : ''} ${
                      dropdownCell?.row === row && dropdownCell?.col === col ? 'dropdown-active' : ''
                    }`}
                    style={{ position: 'relative' }}
                  >
                    <div className="cell-content">
                      <span>{cellData?.formatted || '-'}</span>
                      {isMultiple && (
                        <button
                          className="multiple-indicator"
                          onClick={(e) => cellData && handleButtonClick(row, col, cellData, e)}
                          title="View multiple values"
                        >
                          ▼
                        </button>
                      )}
                    </div>
                    {dropdownCell?.row === row && dropdownCell?.col === col && (
                      <div
                        className="dropdown"
                        ref={dropdownRef}
                        style={{
                          position: 'fixed',
                          top: `${dropdownCell.top}px`,
                          left: `${dropdownCell.left}px`,
                        }}
                      >
                        {dropdownCell.values.map((item, index) => (
                          <div
                            key={`${item.Cell_id}-${index}`}
                            className={`dropdown-item ${validatedCells[item.Cell_id] ? 'validated' : 'not-validated'}`}
                            onClick={(e) => handleDropdownItemClick(item, e)}
                          >
                            <input
                              type="checkbox"
                              checked={!!validatedCells[item.Cell_id]}
                              onChange={(e) => handleValidationToggle(item.Cell_id, e)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="dropdown-value">
                              {item.Value_formatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PivotTable;