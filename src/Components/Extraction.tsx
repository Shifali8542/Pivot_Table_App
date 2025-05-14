import { useState, useEffect, useCallback } from 'react';
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
  const [hasLoggedRenderSuccess, setHasLoggedRenderSuccess] = useState(false);

  // Get tableCellsData from JSON
  const tableCellsData = flattenTableCells(
    sampleData.queries[0]?.table_cells_data || []
  );
  const pivotData = [{ data: tableCellsData }];

  // Get PDF file name from JSON
  const pdfFileName = sampleData.PDF?.[0] || 'f_Apax VIII_2017Q2 PTF.pdf';

  useEffect(() => {
    setIsPivotRendered(true); // Assume pivot table renders successfully
  }, []);

  // Callback from Pdf component to update rendering status
  const handlePdfRenderStatus = useCallback((status: boolean) => {
    setIsPdfRendered(status);
  }, []);

  useEffect(() => {
    if (isPivotRendered && isPdfRendered && !hasLoggedRenderSuccess) {
      console.log('Both PivotTable and Pdf rendered successfully');
      setHasLoggedRenderSuccess(true);
    }
  }, [isPivotRendered, isPdfRendered, hasLoggedRenderSuccess]);

  const handleCellClick = (cellId: string, ltrb: [number, number, number, number]) => {
    console.log(`Clicked Cell ID: ${cellId}`);
    console.log(`LTRB Coordinates:`, ltrb);
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

      setPdfNavigate({
        page: matchingCell.page || 1,
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
          pdfFileName={pdfFileName}
        />
      </div>
    </div>
  );
};

export default Extraction;