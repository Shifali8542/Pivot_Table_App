import React, { useMemo, useState, useEffect } from 'react';
import './PivotTable.scss';

interface PivotDataItem {
  row_header_input: string;
  col_header_input: string;
  Value_formatted: string;
  Cell_id: string;
  _data_point_ltrb: [number, number, number, number];
  Value?: number;
}

interface PivotTableProps {
  data: { data: PivotDataItem[] }[];
  onCellClick?: (cellId: string, ltrb: [number, number, number, number]) => void;
}

const PivotTable: React.FC<PivotTableProps> = ({ data, onCellClick }) => {
  const [sortField, setSortField] = useState<string>('row_header_input');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // Track checked cells by their cellId
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());

  // Process data to create pivot structure
  const pivotData = useMemo(() => {
    const flatData = data[0]?.data || [];
    
    // Extract unique rows and columns
    const rows = Array.from(new Set(flatData.map(item => item.row_header_input))).sort();
    const columns = Array.from(new Set(flatData.map(item => item.col_header_input))).sort();

    // Aggregate values
    const aggregated: { [row: string]: { [col: string]: { value: number; cellId: string; formatted: string; ltrb: [number, number, number, number]; } } } = {};
    
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
          ltrb: item._data_point_ltrb
        };
      }
      aggregated[row][col].value += value;
      aggregated[row][col].formatted = `€${aggregated[row][col].value.toLocaleString()}`;
      aggregated[row][col].cellId = item.Cell_id;
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

  // Handle cell click and track checked cells
  const handleCellClick = (cellId: string, ltrb: [number, number, number, number]) => {
    // Mark this cellId as checked
    setCheckedCells(prev => {
      const newSet = new Set(prev);
      newSet.add(cellId);
      return newSet;
    });
    
    // Call the parent onCellClick handler
    onCellClick?.(cellId, ltrb);
  };

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
                const cellId = cellData?.cellId || '';
                const isChecked = checkedCells.has(cellId);
                const hasValue = cellData && cellData.formatted !== '-';
                
                return (
                  <td
                    key={`${row}-${col}`}
                    onClick={() =>
                      cellData && 
                      handleCellClick(
                        cellId,
                        cellData.ltrb
                      )
                    }
                    className={`data-cell ${hasValue ? (isChecked ? 'checked-cell' : 'unchecked-cell') : ''}`}
                  >
                    {cellData?.formatted || '-'}
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