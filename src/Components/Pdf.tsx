import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import './pdf.scss';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

interface PdfViewerProps {
  onRenderStatus?: (status: boolean) => void;
  navigateTo?: { page: number; ltrb: [number, number, number, number] } | null;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ onRenderStatus, navigateTo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const pdfInstanceRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const textLayersRef = useRef<(HTMLDivElement | null)[]>([]);
  const overlaysRef = useRef<(HTMLDivElement | null)[]>([]);
  const [hasError, setHasError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [goToPageInput, setGoToPageInput] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [ltrbOverlay, setLtrbOverlay] = useState<{
    left: number;
    top: number;
    values: [number, number, number, number];
  } | null>(null);
  const pdfUrl = '/Sample.pdf';
  const pdfLocation = 'public/Sample.pdf';
  // Track highlighted elements to toggle them
  const highlightedElementsRef = useRef<Set<HTMLElement>>(new Set());

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const container = containerRef.current;
        if (!container) throw new Error('Container ref is not assigned');

        const pdfResponse = await fetch(pdfUrl, { method: 'HEAD' });
        if (!pdfResponse.ok) throw new Error(`PDF not found at ${pdfUrl}. Status: ${pdfResponse.status}.`);

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        pdfInstanceRef.current = pdf;
        setTotalPages(pdf.numPages);
        renderAllPages(pdf, scale, rotation);
        onRenderStatus?.(true);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error loading PDF';
        setHasError(errorMessage);
        onRenderStatus?.(false);
      }
    };

    loadPDF();

    return () => {
      if (pdfInstanceRef.current) pdfInstanceRef.current.destroy();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [pdfUrl, onRenderStatus]);

  // Render all pages
  const renderAllPages = async (pdf: pdfjsLib.PDFDocumentProxy, scale: number, rotation: number) => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    canvasesRef.current = [];
    textLayersRef.current = [];
    overlaysRef.current = [];
    highlightedElementsRef.current.clear();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });

      // Create page wrapper
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-wrapper';
      pageWrapper.style.position = 'relative';
      container.appendChild(pageWrapper);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      pageWrapper.appendChild(canvas);
      canvasesRef.current[pageNum - 1] = canvas;

      // Render PDF to canvas
      const context = canvas.getContext('2d')!;
      await page.render({ canvasContext: context, viewport }).promise;

      // Create text layer
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.top = '0';
      textLayerDiv.style.left = '0';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      pageWrapper.appendChild(textLayerDiv);
      textLayersRef.current[pageNum - 1] = textLayerDiv;

      const textContent = await page.getTextContent();
      pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
        textDivs: [],
      });

      // Create overlay for annotations
      const overlay = document.createElement('div');
      overlay.className = 'pdf-page-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = `${viewport.width}px`;
      overlay.style.height = `${viewport.height}px`;
      overlay.style.pointerEvents = 'none';
      pageWrapper.appendChild(overlay);
      overlaysRef.current[pageNum - 1] = overlay;

      canvas.style.transform = `rotate(${rotation}deg)`;
      textLayerDiv.style.transform = `rotate(${rotation}deg)`;
      overlay.style.transform = `rotate(${rotation}deg)`;

      // Add click handlers for word and line highlighting
      setTimeout(() => {
        const spans = textLayerDiv.querySelectorAll('span');
        spans.forEach(span => {
          span.style.cursor = 'pointer';
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle highlight for the word
            if (highlightedElementsRef.current.has(span as HTMLElement)) {
              span.style.backgroundColor = '';
              highlightedElementsRef.current.delete(span as HTMLElement);
            } else {
              // Clear all highlights
              highlightedElementsRef.current.forEach(el => {
                el.style.backgroundColor = '';
              });
              highlightedElementsRef.current.clear();
              span.style.backgroundColor = 'orange';
              highlightedElementsRef.current.add(span as HTMLElement);
            }
          });
        });

        // Add click handler for the text layer to highlight the line
        textLayerDiv.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          // Only handle clicks that are not on individual spans
          if (target.tagName.toLowerCase() !== 'span') {
            const lineDiv = target.closest('.textLayer > div') as HTMLElement | null;
            if (lineDiv) {
              if (highlightedElementsRef.current.has(lineDiv)) {
                lineDiv.querySelectorAll('span').forEach(s => {
                  s.style.backgroundColor = '';
                });
                highlightedElementsRef.current.delete(lineDiv);
              } else {
                // Clear all highlights
                highlightedElementsRef.current.forEach(el => {
                  el.style.backgroundColor = '';
                });
                highlightedElementsRef.current.clear();
                lineDiv.querySelectorAll('span').forEach(s => {
                  s.style.backgroundColor = 'orange';
                });
                highlightedElementsRef.current.add(lineDiv);
              }
            }
          }
        });
      }, 300);
    }
  };

  // Re-render on scale or rotation change
  useEffect(() => {
    if (pdfInstanceRef.current) {
      renderAllPages(pdfInstanceRef.current, scale, rotation);
    }
  }, [scale, rotation]);

  // Handle LTRB navigation and annotations
  useEffect(() => {
    if (!navigateTo || !pdfInstanceRef.current) {
      setLtrbOverlay(null);
      return;
    }

    const { page, ltrb } = navigateTo;
    const [left, top, right, bottom] = ltrb;

    const addHighlightAndOverlay = async () => {
      try {
        setCurrentPage(page);
        const pageCanvas = canvasesRef.current[page - 1];
        if (pageCanvas) pageCanvas.scrollIntoView({ behavior: 'smooth' });

        if (!pdfInstanceRef.current) {
          throw new Error('PDF instance is not loaded');
        }
        const pdfPage = await pdfInstanceRef.current.getPage(page);
        const viewport = pdfPage.getViewport({ scale, rotation });

        const scaledLeft = left * scale;
        const scaledTop = top * scale;
        const scaledRight = right * scale;
        const scaledBottom = bottom * scale;

        const overlay = overlaysRef.current[page - 1];
        if (overlay) {
          overlay.querySelectorAll('.pdf-highlight').forEach(el => el.remove());

          const highlight = document.createElement('div');
          highlight.className = 'pdf-highlight';
          highlight.style.position = 'absolute';
          highlight.style.left = `${scaledLeft}px`;
          highlight.style.top = `${scaledTop}px`;
          highlight.style.width = `${scaledRight - scaledLeft}px`;
          highlight.style.height = `${scaledBottom - scaledTop}px`;
          highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
          overlay.appendChild(highlight);
        }

        setLtrbOverlay({
          left: scaledRight + 10,
          top: scaledTop,
          values: ltrb,
        });
      } catch (error) {
        console.error('Error adding annotation or overlay:', error);
        setLtrbOverlay(null);
      }
    };

    addHighlightAndOverlay();
  }, [navigateTo, scale, rotation]);

  // Toolbar actions
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const fitToPage = async () => {
    if (!pdfInstanceRef.current || !containerRef.current) return;
    const pdf = pdfInstanceRef.current;
    const page = await pdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.0, rotation });
    const containerWidth = containerRef.current.clientWidth;
    setScale(containerWidth / viewport.width);
  };
  const rotateClockwise = () => setRotation(prev => (prev + 90) % 360);
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => {
        const newPage = prev - 1;
        const pageCanvas = canvasesRef.current[newPage - 1];
        if (pageCanvas) pageCanvas.scrollIntoView({ behavior: 'smooth' });
        return newPage;
      });
    }
  };
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => {
        const newPage = prev + 1;
        const pageCanvas = canvasesRef.current[newPage - 1];
        if (pageCanvas) pageCanvas.scrollIntoView({ behavior: 'smooth' });
        return newPage;
      });
    }
  };
  const goToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      setGoToPageInput('');
      return;
    }
    setCurrentPage(pageNum);
    const pageCanvas = canvasesRef.current[pageNum - 1];
    if (pageCanvas) pageCanvas.scrollIntoView({ behavior: 'smooth' });
    setGoToPageInput('');
  };
  const toggleFullscreen = () => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    if (!isFullscreen) {
      if (pdfViewer.requestFullscreen) pdfViewer.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  const downloadPDF = () => {
    if (pdfInstanceRef.current) {
      pdfInstanceRef.current.getData().then((data: Uint8Array) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Sample.pdf';
        link.click();
        window.URL.revokeObjectURL(url);
      });
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="pdf-viewer-container" ref={pdfViewerRef}>
      <nav className="pdf-toolbar">
        <button className="nav-button prev-button" onClick={prevPage} disabled={currentPage <= 1} title="Previous Page">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="page-info">
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <button className="nav-button next-button" onClick={nextPage} disabled={currentPage >= totalPages} title="Next Page">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button className="nav-button zoom-button zoom-in" onClick={zoomIn} disabled={scale >= 3} title="Zoom In">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-7-7v6m0 0H6m6 0h6" />
          </svg>
        </button>
        <button className="nav-button zoom-button zoom-out" onClick={zoomOut} disabled={scale <= 0.25} title="Zoom Out">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-4 0H6" />
          </svg>
        </button>
        <button className="nav-button fit-button" onClick={fitToPage} title="Fit to Page">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button className="nav-button rotate-button" onClick={rotateClockwise} title="Rotate Clockwise">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5m0 0l-7 7m14-7h5v5m0 0l-7-7" />
          </svg>
        </button>
        <div className="go-to-page">
          <input
            type="number"
            value={goToPageInput}
            onChange={e => setGoToPageInput(e.target.value)}
            placeholder="Go to page"
            min="1"
            max={totalPages}
          />
          <button onClick={goToPage} title="Go to Page">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button className="nav-button fullscreen-button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFullscreen ? 'M6 18L18 6M6 6l12 12' : 'M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3'} />
          </svg>
        </button>
        <button className="nav-button download-button" onClick={downloadPDF} disabled={!pdfInstanceRef.current} title="Download PDF">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </nav>
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
          <div ref={containerRef} className="pdf-container" style={{ height: '100%', width: '100%' }} />
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

export default PdfViewer;