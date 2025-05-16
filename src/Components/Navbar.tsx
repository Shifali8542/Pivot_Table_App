import React, { useState } from 'react';
import './Navbar.scss';

interface NavbarProps {
  onHidePdf: () => void;
  onHidePivot: () => void;
  isPdfHidden: boolean;
  isPivotHidden: boolean;
  onToggleCompanyCards: () => void;
  isCompanyCardsVisible: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onHidePdf, 
  onHidePivot, 
  isPdfHidden, 
  isPivotHidden,
  onToggleCompanyCards,
  isCompanyCardsVisible
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {/* <h1>Extraction Dashboard</h1> */}
      </div>
      <div className="navbar-buttons">
        <button 
          className={`navbar-button company-button ${isCompanyCardsVisible ? 'active' : ''}`}
          onClick={onToggleCompanyCards}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered ? 'Company' : '☰'}
        </button>
        <button className="navbar-button" onClick={onHidePdf}>
          {isPdfHidden ? 'Show PDF' : 'Hide PDF'}
        </button>
        <button className="navbar-button" onClick={onHidePivot}>
          {isPivotHidden ? 'Show Pivot Table' : 'Hide Pivot Table'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;