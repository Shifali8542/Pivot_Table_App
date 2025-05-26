import React from 'react';
import './CompanyCards.scss';

interface CompanyData {
  company: string;
  values: { [column: string]: { value: number; formatted: string } };
}

interface CompanyCardsProps {
  companies: CompanyData[];
  onClose: () => void;
}

const CompanyCards: React.FC<CompanyCardsProps> = ({ companies, onClose }) => {
  if (!companies || companies.length === 0) {
    return (
      <div className="company-cards-container">
        <div className="company-cards-header">
          <h3>Companies</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="no-companies">No company data available</div>
      </div>
    );
  }

  return (
    <div className="company-cards-container">
      <div className="company-cards-header">
        <h3>Companies</h3>
        <button className="close-button" onClick={onClose}>&times;</button>
      </div>
      <div className="company-cards-list">
        {companies.map((company, index) => {
          const totalValue = Object.values(company.values).reduce(
            (sum, val) => sum + val.value, 0
          );
          
          return (
            <div key={index} className="company-card">
              <h4>{company.company}</h4>
              <div className="company-total">
                Total: €{totalValue.toLocaleString()}
              </div>
              <div className="company-values">
                {Object.entries(company.values).map(([column, data], idx) => (
                  <div key={idx} className="company-value-item">
                    <span className="column-name">{column}:</span>
                    <span className="column-value">{data.formatted}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyCards;