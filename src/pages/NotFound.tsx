import { useNavigate } from 'react-router-dom';
import React from 'react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-root" role="main">
      <div className="notfound-shapes" aria-hidden="true">
        <div className="shape shape-left" />
        <div className="shape shape-right" />
      </div>

      <div className="notfound-card">
        <div className="doc-icon" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <mask id="path-1-inside-1_1_7431" fill="white">
              <path d="M0 24C0 10.7452 10.7452 0 24 0H71.99C85.2449 0 95.99 10.7452 95.99 24V71.99C95.99 85.2449 85.2449 95.99 71.99 95.99H24C10.7452 95.99 0 85.2449 0 71.99V24Z"/>
            </mask>
            <path d="M0 24C0 10.7452 10.7452 0 24 0H71.99C85.2449 0 95.99 10.7452 95.99 24V71.99C95.99 85.2449 85.2449 95.99 71.99 95.99H24C10.7452 95.99 0 85.2449 0 71.99V24Z" fill="url(#paint0_linear_1_7431)"/>
            <path d="M24 0V0.685796H71.99V0V-0.685796H24V0ZM95.99 24H95.3042V71.99H95.99H96.6758V24H95.99ZM71.99 95.99V95.3042H24V95.99V96.6758H71.99V95.99ZM0 71.99H0.685796V24H0H-0.685796V71.99H0ZM24 95.99V95.3042C11.1239 95.3042 0.685796 84.8661 0.685796 71.99H0H-0.685796C-0.685796 85.6236 10.3664 96.6758 24 96.6758V95.99ZM95.99 71.99H95.3042C95.3042 84.8661 84.8661 95.3042 71.99 95.3042V95.99V96.6758C85.6236 96.6758 96.6758 85.6236 96.6758 71.99H95.99ZM71.99 0V0.685796C84.8661 0.685796 95.3042 11.1239 95.3042 24H95.99H96.6758C96.6758 10.3664 85.6236 -0.685796 71.99 -0.685796V0ZM24 0V-0.685796C10.3664 -0.685796 -0.685796 10.3664 -0.685796 24H0H0.685796C0.685796 11.1239 11.1239 0.685796 24 0.685796V0Z" fill="white" fill-opacity="0.1" mask="url(#path-1-inside-1_1_7431)"/>
            <path d="M47.9893 57.9888H48.0093" stroke="#6A7282" stroke-width="3.99959" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M53.9889 27.9917H35.9908C34.93 27.9917 33.9127 28.4131 33.1627 29.1632C32.4126 29.9132 31.9912 30.9305 31.9912 31.9913V63.988C31.9912 65.0487 32.4126 66.066 33.1627 66.8161C33.9127 67.5662 34.93 67.9875 35.9908 67.9875H59.9883C61.0491 67.9875 62.0664 67.5662 62.8164 66.8161C63.5665 66.066 63.9879 65.0487 63.9879 63.988V37.9907L53.9889 27.9917Z" stroke="#6A7282" stroke-width="3.99959" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M42.1904 41.9902C42.6703 40.6676 43.5998 39.5557 44.8164 38.8489C46.033 38.1422 47.4593 37.8855 48.846 38.1238C50.2326 38.362 51.4914 39.0801 52.4023 40.1524C53.3132 41.2247 53.8183 42.583 53.8292 43.99C53.8292 47.9895 47.8298 49.9893 47.8298 49.9893" stroke="#6A7282" stroke-width="3.99959" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear_1_7431" x1="0" y1="0" x2="95.99" y2="95.99" gradientUnits="userSpaceOnUse">
                <stop stop-color="white" stop-opacity="0.05"/>
                <stop offset="1" stop-color="white" stop-opacity="0.1"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">Page not found</h2>
        <p className="nf-desc">This page doesn't exist or was moved. Check the URL or return to the dashboard.</p>

        <div className="nf-actions" role="group" aria-label="404 actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/', { replace: true })}
          >
            <span className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_1_7424)">
                  <path d="M9.99861 13.9984V8.66562C9.99861 8.48883 9.92838 8.31928 9.80337 8.19427C9.67836 8.06925 9.5088 7.99902 9.33201 7.99902H6.66562C6.48883 7.99902 6.31928 8.06925 6.19427 8.19427C6.06925 8.31928 5.99902 8.48883 5.99902 8.66562V13.9984" stroke="white" strokeWidth="1.3332" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 6.66593C1.99995 6.47199 2.04222 6.28038 2.12385 6.10447C2.20547 5.92855 2.3245 5.77255 2.47262 5.64737L7.1388 1.64845C7.37943 1.44508 7.68432 1.3335 7.99938 1.3335C8.31444 1.3335 8.61932 1.44508 8.85996 1.64845L13.5261 5.64737C13.6743 5.77255 13.7933 5.92855 13.8749 6.10447C13.9565 6.28038 13.9988 6.47199 13.9988 6.66593V12.6653C13.9988 13.0189 13.8583 13.358 13.6083 13.608C13.3582 13.858 13.0191 13.9985 12.6656 13.9985H3.3332C2.97961 13.9985 2.64051 13.858 2.39048 13.608C2.14046 13.358 2 13.0189 2 12.6653V6.66593Z" stroke="white" strokeWidth="1.3332" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_1_7424">
                    <rect width="15.9983" height="15.9983" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </span>
            Go to dashboard
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => window.location.href = '/'}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
