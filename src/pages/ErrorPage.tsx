import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ErrorPage.css';

interface ErrorPageProps {
  onRetry?: () => void;
  errorMessage?: string;
}

export default function ErrorPage({ onRetry, errorMessage }: ErrorPageProps) {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleBackToDashboard = () => {
    navigate('/app');
  };

  return (
    <div className="error-page-container">
      <div className="error-content">
        <div className="error-icon-wrapper">
          <div className="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <h1 className="error-heading">Something went wrong</h1>
        
        <p className="error-description">
          {errorMessage || "We couldn't complete your request. Please try again or return to the dashboard."}
        </p>

        <div className="error-actions">
          <button className="btn-retry" onClick={handleRetry}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Try again
          </button>
          
          <button className="btn-dashboard" onClick={handleBackToDashboard}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
