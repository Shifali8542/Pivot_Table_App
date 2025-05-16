import { useState, useEffect, useCallback, useRef } from 'react';
import PivotTable from './PivotTable';
import Pdf from './Pdf';
import Navbar from './Navbar';
import CompanyCards from './CompanyCard';
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
  const [pdfWidth, setPdfWidth] = useState<number>(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState<boolean>(false);
  const [isDraggingSection, setIsDraggingSection] = useState<string | null>(null);
  const [layoutOrder, setLayoutOrder] = useState<'pivot-pdf' | 'pdf-pivot'>('pivot-pdf');
  const [isPdfHidden, setIsPdfHidden] = useState<boolean>(false);
  const [isPivotHidden, setIsPivotHidden] = useState<boolean>(false);
  const [isCompanyCardsVisible, setIsCompanyCardsVisible] = useState<boolean>(false);
  const [lastLayoutState, setLastLayoutState] = useState<{
    pdfWidth: number;
    layoutOrder: 'pivot-pdf' | 'pdf-pivot';
  } | null>(null); // Store layout state before hiding
  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggedSectionRef = useRef<HTMLDivElement | null>(null);

  // Get tableCellsData from JSON
  const tableCellsData = flattenTableCells(
    sampleData.queries[0]?.table_cells_data || []
  );
  const pivotData = [{ data: tableCellsData }];

  // Get PDF file name from JSON
  const pdfFileName = sampleData?.[0] || 'f_Apax VIII_2017Q2 PTF.pdf';

  // Generate company data for cards
  const companyData = useMemo(() => {
    const flatData = pivotData[0]?.data || [];
    
    // Extract unique rows (companies) and columns
    const rows = Array.from(new Set(flatData.map(item => item.row_header_input))).sort();
    const columns = Array.from(new Set(flatData.map(item => item.col_header_input))).sort();
    
    // Aggregate values by company and column
    return rows.map(company => {
      const companyValues: { [column: string]: { value: number; formatted: string } } = {};
      
      columns.forEach(column => {
        const cellsForCompanyAndColumn = flatData.filter(
          item => item.row_header_input === company && item.col_header_input === column
        );
        
        if (cellsForCompanyAndColumn.length > 0) {
          const totalValue = cellsForCompanyAndColumn.reduce((sum, item) => {
            const valueStr = item.Value_formatted?.replace(/[^\d.-]/g, '') || '0';
            return sum + (parseFloat(valueStr) || 0);
          }, 0);
          
          companyValues[column] = {
            value: totalValue,
            formatted: `€${totalValue.toLocaleString()}`
          };
        }
      });
      
      return {
        company,
        values: companyValues
      };
    });
  }, [pivotData]);

  useEffect(() => {
    setIsPivotRendered(true);
  }, []);

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

  // Company cards toggle
  const toggleCompanyCards = () => {
    setIsCompanyCardsVisible(!isCompanyCardsVisible);
  };

  // Divider drag functionality for resizing
  const handleDividerMouseDown = () => {
    setIsDraggingDivider(true);
  };

  const handleDividerMouseUp = () => {
    setIsDraggingDivider(false);
  };

  const handleDividerMouseMove = (e: MouseEvent) => {
    if (!isDraggingDivider || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left;
    let newWidth = (newX / containerRect.width) * 100;

    if (layoutOrder === 'pdf-pivot') {
      newWidth = 100 - newWidth;
    }

    if (newWidth >= 5 && newWidth <= 95) {
      setPdfWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isDraggingDivider) {
      window.addEventListener('mousemove', handleDividerMouseMove);
      window.addEventListener('mouseup', handleDividerMouseUp);
    } else {
      window.removeEventListener('mousemove', handleDividerMouseMove);
      window.removeEventListener('mouseup', handleDividerMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleDividerMouseMove);
      window.removeEventListener('mouseup', handleDividerMouseUp);
    };
  }, [isDraggingDivider, layoutOrder]);

  const handleDividerDoubleClick = () => {
    if (layoutOrder === 'pivot-pdf') {
      if (pdfWidth > 50) {
        setPdfWidth(5);
      } else if (pdfWidth < 50) {
        setPdfWidth(95);
      } else {
        setPdfWidth(95);
      }
    } else {
      if (pdfWidth > 50) {
        setPdfWidth(5);
      } else if (pdfWidth < 50) {
        setPdfWidth(95);
      } else {
        setPdfWidth(5);
      }
    }
  };

  // Drag and drop functionality to swap sections
  const handleSectionDragStart = (e: React.DragEvent<HTMLDivElement>, section: string) => {
    setIsDraggingSection(section);
    draggedSectionRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleSectionDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSectionDrop = (e: React.DragEvent<HTMLDivElement>, targetSection: string) => {
    e.preventDefault();
    if (isDraggingSection && isDraggingSection !== targetSection) {
      setLayoutOrder(layoutOrder === 'pivot-pdf' ? 'pdf-pivot' : 'pivot-pdf');
      setPdfWidth(100 - pdfWidth);
    }
    setIsDraggingSection(null);
    if (draggedSectionRef.current) {
      draggedSectionRef.current.classList.remove('dragging');
      draggedSectionRef.current = null;
    }
  };

  const handleSectionDragEnd = () => {
    setIsDraggingSection(null);
    if (draggedSectionRef.current) {
      draggedSectionRef.current.classList.remove('dragging');
      draggedSectionRef.current = null;
    }
  };

  // Toggle visibility functions for the navbar buttons
  const togglePdfVisibility = () => {
    if (!isPdfHidden) {
      // Before hiding, save the current layout state
      setLastLayoutState({ pdfWidth, layoutOrder });
      setIsPdfHidden(true);
    } else {
      // When showing, restore the last layout state if available
      if (lastLayoutState) {
        setPdfWidth(lastLayoutState.pdfWidth);
        setLayoutOrder(lastLayoutState.layoutOrder);
      }
      setIsPdfHidden(false);
    }
  };

  const togglePivotVisibility = () => {
    if (!isPivotHidden) {
      // Before hiding, save the current layout state
      setLastLayoutState({ pdfWidth, layoutOrder });
      setIsPivotHidden(true);
    } else {
      // When showing, restore the last layout state if available
      if (lastLayoutState) {
        setPdfWidth(lastLayoutState.pdfWidth);
        setLayoutOrder(lastLayoutState.layoutOrder);
      }
      setIsPivotHidden(false);
    }
  };

  // Adjust pdfWidth based on visibility states, but only when hiding
  useEffect(() => {
    if (isPdfHidden && isPivotHidden) {
      // If both are hidden, do not modify pdfWidth (preserve last state)
    } else if (isPdfHidden) {
      setPdfWidth(0); // Maximize pivot table
    } else if (isPivotHidden) {
      setPdfWidth(100); // Maximize PDF
    }
    // Removed the reset to 50/50 when both are hidden to preserve lastLayoutState
  }, [isPdfHidden, isPivotHidden]);

  // Render sections based on layout order and visibility
  const renderSections = () => {
    const pivotSection = !isPivotHidden && (
      <div
        className="pivot-section"
        draggable
        onDragStart={(e) => handleSectionDragStart(e, 'pivot')}
        onDragOver={handleSectionDragOver}
        onDrop={(e) => handleSectionDrop(e, 'pivot')}
        onDragEnd={handleSectionDragEnd}
        style={{
          flex: layoutOrder === 'pivot-pdf' ? `0 0 ${100 - pdfWidth}%` : `0 0 ${pdfWidth}%`,
          width: layoutOrder === 'pivot-pdf' ? `${100 - pdfWidth}%` : `${pdfWidth}%`,
          maxWidth: layoutOrder === 'pivot-pdf' ? `${100 - pdfWidth}%` : `${pdfWidth}%`,
        }}
      >
        <PivotTable
          data={pivotData}
          onCellClick={handleCellClick}
        />
      </div>
    );

    const pdfSection = !isPdfHidden && (
      <div
        className="pdf-section"
        draggable
        onDragStart={(e) => handleSectionDragStart(e, 'pdf')}
        onDragOver={handleSectionDragOver}
        onDrop={(e) => handleSectionDrop(e, 'pdf')}
        onDragEnd={handleSectionDragEnd}
        style={{
          flex: layoutOrder === 'pivot-pdf' ? `0 0 ${pdfWidth}%` : `0 0 ${100 - pdfWidth}%`,
          width: layoutOrder === 'pivot-pdf' ? `${pdfWidth}%` : `${100 - pdfWidth}%`,
          maxWidth: layoutOrder === 'pivot-pdf' ? `${pdfWidth}%` : `${100 - pdfWidth}%`,
        }}
      >
        <Pdf
          onRenderStatus={handlePdfRenderStatus}
          navigateTo={pdfNavigate}
          pdfFileName={pdfFileName}
        />
      </div>
    );

    const divider = (!isPdfHidden || !isPivotHidden) && (isPdfHidden || isPivotHidden ? null : (
      <div
        className="divider"
        ref={dividerRef}
        onMouseDown={handleDividerMouseDown}
        onDoubleClick={handleDividerDoubleClick}
      >
        <span className="divider-arrow">&lt;--&gt;</span>
      </div>
    ));

    return layoutOrder === 'pivot-pdf' ? (
      <>
        {pivotSection}
        {divider}
        {pdfSection}
      </>
    ) : (
      <>
        {pdfSection}
        {divider}
        {pivotSection}
      </>
    );
  };

  return (
    <div className="extraction-wrapper">
      <Navbar
        onHidePdf={togglePdfVisibility}
        onHidePivot={togglePivotVisibility}
        isPdfHidden={isPdfHidden}
        isPivotHidden={isPivotHidden}
        onToggleCompanyCards={toggleCompanyCards}
        isCompanyCardsVisible={isCompanyCardsVisible}
      />
      <div className="extraction-container" ref={containerRef}>
        {renderSections()}
        {isCompanyCardsVisible && (
          <CompanyCards 
            companies={companyData} 
            onClose={toggleCompanyCards} 
          />
        )}
      </div>
    </div>
  );
};

export default Extraction;

// Simple implementation of useMemo for this context
function useMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ value: T; deps: any[] } | null>(null);

  if (
    !ref.current ||
    ref.current.deps.length !== deps.length ||
    ref.current.deps.some((dep, i) => dep !== deps[i])
  ) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
}

