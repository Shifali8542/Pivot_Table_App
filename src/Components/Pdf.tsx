import React, { useEffect, useRef, useState } from 'react';
import * as PDFJS from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs'; // Import the worker script
import './Pdf.scss';

// Set the worker source for PDF.js
PDFJS.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfProps {
  onRenderStatus?: (status: boolean) => void;
  navigateTo?: { page: number; ltrb: [number, number, number, number] } | null;
}

const Pdf: React.FC<PdfProps> = ({ onRenderStatus, navigateTo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null); // Ref for fullscreen
  const [hasError, setHasError] = useState<string | null>(null);
  const pdfUrl = '/Sample.pdf'; // Path to PDF in public/
  const pdfLocation = 'public/Sample.pdf'; // File location to display
  const pdfInstanceRef = useRef<any>(null); // Store PDF.js document instance
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]); // Store canvas elements for each page
  const overlaysRef = useRef<(HTMLDivElement | null)[]>([]); // Store overlay divs for each page
  const [currentPage, setCurrentPage] = useState<number>(1); // Current page number
  const [totalPages, setTotalPages] = useState<number>(0); // Total number of pages
  const [scale, setScale] = useState<number>(1.0); // Zoom scale
  const [rotation, setRotation] = useState<number>(0); // Rotation angle in degrees
  const [ltrbOverlay, setLtrbOverlay] = useState<{
    left: number;
    top: number;
    values: [number, number, number, number];
  } | null>(null); // Store LTRB overlay position and values
  const [goToPageInput, setGoToPageInput] = useState<string>(''); // Input for "Go to Page"
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false); // Fullscreen state

  // Load and render the PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const container = containerRef.current;
        if (!container) {
          throw new Error('Container ref is not assigned');
        }

        container.innerHTML = '';

        const pdfResponse = await fetch(pdfUrl, { method: 'HEAD' });
        if (!pdfResponse.ok) {
          throw new Error(`PDF not found at ${pdfUrl}. Status: ${pdfResponse.status}.`);
        }

        const loadingTask = PDFJS.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        pdfInstanceRef.current = pdf;

        setTotalPages(pdf.numPages);
        renderAllPages(pdf, scale, rotation);

        console.log('PDF.js loaded successfully');
        onRenderStatus?.(true);
      } catch (error: any) {
        console.error('Error loading PDF.js:', error);
        const errorMessage = error.message || 'Unknown error loading PDF';
        setHasError(errorMessage);
        onRenderStatus?.(false);
      }
    };

    loadPDF();

    return () => {
      if (pdfInstanceRef.current) {
        pdfInstanceRef.current.destroy();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [pdfUrl, onRenderStatus]);

  // Function to render all pages with the current scale and rotation
  const renderAllPages = async (pdf: any, scale: number, rotation: number) => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = ''; // Clear existing canvases
    canvasesRef.current = [];
    overlaysRef.current = [];

    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Create page wrapper div
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-wrapper';
      pageWrapper.style.position = 'relative';
      container.appendChild(pageWrapper);

      // Create canvas for PDF rendering
      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      pageWrapper.appendChild(canvas);
      canvasesRef.current[pageNum - 1] = canvas;

      // Create overlay div for annotations
      const overlay = document.createElement('div');
      overlay.className = 'pdf-page-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.pointerEvents = 'none';
      pageWrapper.appendChild(overlay);
      overlaysRef.current[pageNum - 1] = overlay;

      const viewport = page.getViewport({ scale: scale, rotation });
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Set overlay to same dimensions as canvas
      overlay.style.width = `${viewport.width}px`;
      overlay.style.height = `${viewport.height}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;

      // Add click event listener for word highlighting
      canvas.addEventListener('click', (event) => handleCanvasClick(event, pageNum, viewport));

      // Apply rotation
      canvas.style.transform = `rotate(${rotation}deg)`;
      overlay.style.transform = `rotate(${rotation}deg)`;
    }
  };

  // Handle canvas click to highlight clicked word
  const handleCanvasClick = async (event: MouseEvent, pageNum: number, viewport: any) => {
    const canvas = canvasesRef.current[pageNum - 1];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    try {
      const page = await pdfInstanceRef.current.getPage(pageNum);
      const textContent = await page.getTextContent();

      let closestItem: any = null;
      let minDistance = Infinity;

      textContent.items.forEach((item: any) => {
        const [left, bottom, right, top] = item.transform;
        const itemX = left;
        const itemY = viewport.height - top;

        const distance = Math.sqrt(Math.pow(x - itemX, 2) + Math.pow(y - itemY, 2));
        if (distance < minDistance) {
          minDistance = distance;
          closestItem = item;
        }
      });

      if (closestItem) {
        const [left, bottom, right, top] = closestItem.transform;
        const width = right - left;
        const height = top - bottom;

        // Clear previous word highlights
        overlaysRef.current.forEach((overlay) => {
          if (overlay) {
            overlay.querySelectorAll('.pdf-word-highlight').forEach((el) => el.remove());
          }
        });

        // Add highlight to overlay
        const overlay = overlaysRef.current[pageNum - 1];
        if (overlay) {
          const highlightDiv = document.createElement('div');
          highlightDiv.className = 'pdf-word-highlight';
          highlightDiv.style.position = 'absolute';
          highlightDiv.style.left = `${left * scale}px`;
          highlightDiv.style.top = `${(viewport.height - top) * scale}px`;
          highlightDiv.style.width = `${width * scale}px`;
          highlightDiv.style.height = `${height * scale}px`;
          highlightDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
          highlightDiv.style.pointerEvents = 'none';
          overlay.appendChild(highlightDiv);
        }
      }
    } catch (error) {
      console.error(`Error highlighting word on page ${pageNum}:`, error);
    }
  };

  // Re-render when scale or rotation changes
  useEffect(() => {
    if (pdfInstanceRef.current) {
      renderAllPages(pdfInstanceRef.current, scale, rotation);
    }
  }, [scale, rotation]);

  // Handle navigation and custom annotation
  useEffect(() => {
    if (!navigateTo || !pdfInstanceRef.current) {
      setLtrbOverlay(null); // Clear overlay if no navigation
      return;
    }

    const { page, ltrb } = navigateTo;
    const [left, top, right, bottom] = ltrb;

    const addHighlightAndOverlay = async () => {
      try {
        // Update current page and scroll to it
        setCurrentPage(page);
        const pageCanvas = canvasesRef.current[page - 1];
        if (pageCanvas) {
          pageCanvas.scrollIntoView({ behavior: 'smooth' });
        }

        // Get the page to calculate the viewport for coordinate scaling
        const pdfPage = await pdfInstanceRef.current.getPage(page);
        const viewport = pdfPage.getViewport({ scale: scale, rotation });

        // Scale the LTRB coordinates based on the current scale
        const scaledLeft = left * scale;
        const scaledTop = top * scale;
        const scaledRight = right * scale;
        const scaledBottom = bottom * scale;

        // Get overlay div for this page
        const overlay = overlaysRef.current[page - 1];
        if (overlay) {
          // Clear existing LTRB highlights
          overlay.querySelectorAll('.pdf-highlight').forEach((el) => el.remove());

          // Create highlight element
          const highlight = document.createElement('div');
          highlight.className = 'pdf-highlight';
          highlight.style.position = 'absolute';
          highlight.style.left = `${scaledLeft}px`;
          highlight.style.top = `${scaledTop}px`;
          highlight.style.width = `${scaledRight - scaledLeft}px`;
          highlight.style.height = `${scaledBottom - scaledTop}px`;
          highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
          highlight.style.pointerEvents = 'none';

          overlay.appendChild(highlight);

          console.log('Highlight annotation added at:', {
            left: scaledLeft,
            top: scaledTop,
            width: scaledRight - scaledLeft,
            height: scaledBottom - scaledTop,
          });
        }

        // Calculate the position for the LTRB overlay
        const overlayLeft = scaledRight + 10;
        const overlayTop = scaledTop;

        setLtrbOverlay({
          left: overlayLeft,
          top: overlayTop,
          values: ltrb,
        });
      } catch (error) {
        console.error('Error adding annotation or overlay:', error);
        setLtrbOverlay(null);
      }
    };

    addHighlightAndOverlay();
  }, [navigateTo, scale, rotation]);

  // Zoom in
  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3.0)); // Max zoom 3x
  };

  // Zoom out
  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.25)); // Min zoom 0.25x
  };

  // Fit to page
  const fitToPage = async () => {
    if (!pdfInstanceRef.current || !containerRef.current) return;
    const pdf = pdfInstanceRef.current;
    const page = await pdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.0, rotation });
    const containerWidth = containerRef.current.clientWidth;
    const fitScale = containerWidth / viewport.width;
    setScale(fitScale);
  };

  // Rotate clockwise
  const rotateClockwise = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  // Navigate to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => {
        const newPage = prevPage - 1;
        const pageCanvas = canvasesRef.current[newPage - 1];
        if (pageCanvas) {
          pageCanvas.scrollIntoView({ behavior: 'smooth' });
        }
        return newPage;
      });
    }
  };

  // Navigate to next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => {
        const newPage = prevPage + 1;
        const pageCanvas = canvasesRef.current[newPage - 1];
        if (pageCanvas) {
          pageCanvas.scrollIntoView({ behavior: 'smooth' });
        }
        return newPage;
      });
    }
  };

  // Go to specific page
  const goToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      setGoToPageInput('');
      return;
    }
    setCurrentPage(pageNum);
    const pageCanvas = canvasesRef.current[pageNum - 1];
    if (pageCanvas) {
      pageCanvas.scrollIntoView({ behavior: 'smooth' });
    }
    setGoToPageInput('');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;

    if (!isFullscreen) {
      if (pdfViewer.requestFullscreen) {
        pdfViewer.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Download the PDF
  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'Sample.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pdf-viewer-container" ref={pdfViewerRef}>
      <div className="pdf-toolbar">
        <button
          className="nav-button prev-button"
          onClick={prevPage}
          disabled={currentPage <= 1}
          title="Previous Page"
        >
          <span>←</span>
        </button>
        <div className="page-info">
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <button
          className="nav-button next-button"
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          title="Next Page"
        >
          <span>→</span>
        </button>
        <button
          className="nav-button zoom-button zoom-in"
          onClick={zoomIn}
          title="Zoom In"
        >
          <span>+</span>
        </button>
        <button
          className="nav-button zoom-button zoom-out"
          onClick={zoomOut}
          title="Zoom Out"
        >
          <span>-</span>
        </button>
        <button
          className="nav-button fit-button"
          onClick={fitToPage}
          title="Fit to Page"
        >
          <span>↔</span>
        </button>
        <button
          className="nav-button rotate-button"
          onClick={rotateClockwise}
          title="Rotate Clockwise"
        >
          <span>↻</span>
        </button>
        <div className="go-to-page">
          <input
            type="number"
            value={goToPageInput}
            onChange={(e) => setGoToPageInput(e.target.value)}
            placeholder="Go to page"
            min="1"
            max={totalPages}
          />
          <button onClick={goToPage} title="Go to Page">
            <span>➔</span>
          </button>
        </div>
        <button
          className="nav-button fullscreen-button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <span>{isFullscreen ? '↙' : '↗'}</span>
        </button>
        <button
          className="nav-button download-button"
          onClick={downloadPDF}
          title="Download PDF"
        >
          <span>↓</span>
        </button>
      </div>
      <div className="pdf-location">
        <span>File Location: </span>
        <span className="pdf-path">{pdfLocation}</span>
      </div>
      {hasError ? (
        <div className="pdf-error">
          <h3>Unable to Load PDF</h3>
          <p>{hasError}</p>
        </div>
      ) : (
        <div className="pdf-container-wrapper">
          <div
            ref={containerRef}
            className="pdf-container"
            style={{ height: '100%', width: '100%' }}
          />
          {ltrbOverlay && (
            <div
              className="ltrb-overlay"
              style={{
                position: 'absolute',
                left: ltrbOverlay.left,
                top: ltrbOverlay.top,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              LTRB: [{ltrbOverlay.values[0]}, {ltrbOverlay.values[1]}, {ltrbOverlay.values[2]}, {ltrbOverlay.values[3]}]
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pdf;