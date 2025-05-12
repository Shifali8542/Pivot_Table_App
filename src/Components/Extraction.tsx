import { useState, useEffect } from 'react';
import PivotTable from './PivotTable';
import Pdf from './Pdf';
import rawData from '../data/sampleData.json';
import './Extraction.scss';

const sampleData = rawData as any;

// Flatten 2D array of table cells into single array
const flattenTableCells = (table: any[][]): any[] => {
  const flat: any[] = [];
  table.forEach((row) => {
    row.forEach((cell) => {
      if (cell) flat.push(cell);
    });
  });
  return flat;
};

const Extraction: React.FC = () => {
  const [isPivotRendered, setIsPivotRendered] = useState(false);
  const [isPdfRendered, setIsPdfRendered] = useState(false);
  const [pdfNavigate, setPdfNavigate] = useState<{
    page: number;
    ltrb: [number, number, number, number];
  } | null>(null);

  // Get tableCellsData from JSON
  const tableCellsData = flattenTableCells(
    sampleData.queries[0]?.table_cells_data || []
  );
  const pivotData = [{ data: tableCellsData }];

  useEffect(() => {
    setIsPivotRendered(true); // Assume pivot table renders successfully
  }, []);

  // Callback from Pdf component to update rendering status
  const handlePdfRenderStatus = (status: boolean) => {
    setIsPdfRendered(status);
  };

  useEffect(() => {
    if (isPivotRendered && isPdfRendered) {
      console.log('Both PivotTable and Pdf rendered successfully');
    }
  }, [isPivotRendered, isPdfRendered]);

  const handleCellClick = (cellId: string, ltrb: [number, number, number, number]) => {
    console.log(`Clicked Cell ID: ${cellId}`);
    console.log(`LTRB Coordinates:`, ltrb);
    // Search the full record using the cellId
    const allData = pivotData[0]?.data || [];
    const matchingCell = allData.find((cell: any) => cell.Cell_id === cellId);

    if (matchingCell) {
      console.log('Full Cell Data:', matchingCell);
      console.log('PDF:', matchingCell.PDF);
      console.log('Page:', matchingCell.page);
      console.log('Row Header:', matchingCell.row_header_input);
      console.log('Column Header:', matchingCell.col_header_input);
      console.log('Formatted Value:', matchingCell.Value_formatted);
      console.log('Raw Value:', matchingCell.Value);
      console.log('Text Value:', matchingCell.data_point_text);

      // Navigate to the PDF location and add annotation
      setPdfNavigate({
        page: matchingCell.page || 1, // Default to page 1 if not specified 
        ltrb: ltrb,
      });
    } else {
      console.warn('No matching cell found!');
    }
  };

  return (
    <div className="extraction-container">
      <div className="pivot-section">
        <PivotTable
          data={pivotData}
          onCellClick={handleCellClick}
        />
      </div>
      <div className="pdf-section">
        <Pdf
          onRenderStatus={handlePdfRenderStatus}
          navigateTo={pdfNavigate}
        />
      </div>
    </div>
  );
};

export default Extraction;