import React, { useState } from 'react';
import './Navbar.scss';

// Interface for company data
interface CompanyData {
  company: string;
  values: { [column: string]: { value: number; formatted: string } };
}

interface NavbarProps {
  onHidePdf: () => void;
  onHidePivot: () => void;
  isPdfHidden: boolean;
  isPivotHidden: boolean;
  onToggleCompanyCards: () => void;
  isCompanyCardsVisible: boolean;
  companies: CompanyData[];
  selectedCompany: string | null; // New prop for selected company
}

const Navbar: React.FC<NavbarProps> = ({
  onHidePdf,
  onHidePivot,
  isPdfHidden,
  isPivotHidden,
  onToggleCompanyCards,
  isCompanyCardsVisible,
  companies,
  selectedCompany
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // CompanyCards rendering logic
  const renderCompanyCards = () => {
    // Determine which companies to display
    const companiesToDisplay = isCompanyCardsVisible
      ? companies // Show all companies if the company cards are toggled visible
      : selectedCompany
        ? companies.filter(company => company.company === selectedCompany) // Show only the selected company
        : [];

    if (!companies || companies.length === 0) {
      return null;
    }

    return (
      <div className="company-cards-container">
        <div className="company-cards-header">
          <h3>Companies</h3>
          <button className="close-button" onClick={onToggleCompanyCards}>×</button>
        </div>
        <div className="company-cards-list">
          {companiesToDisplay.map((company, index) => {
            const totalValue = Object.values(company.values).reduce(
              (sum, val) => sum + val.value, 0
            );

            return (
              <div key={index} className="company-card">
                <div className="company-card-header">
                  <h4 className="company-name">{company.company}</h4>
                </div>
                <div className="company-card-body">
                  <div className="company-total-wrapper">
                    <span className="company-total-label">Total:</span>
                    <span className="company-total-value">€{totalValue.toLocaleString()}</span>
                  </div>
                  <div className="company-values-table">
                    {Object.entries(company.values).map(([column, data], idx) => (
                      <div key={idx} className="company-value-row">
                        <span className="company-value-column">{column}</span>
                        <span className="company-value-data">{data.formatted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
      {/* Show company card if cards are visible OR there's a selectedCompany */}
      {(isCompanyCardsVisible || selectedCompany) && renderCompanyCards()}
    </nav>
  );
};

export default Navbar;