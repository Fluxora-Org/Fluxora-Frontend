import React, { useCallback, useRef, useState } from 'react';
import './CsvDropZone.css';
import type { UploadZoneState } from './types';
import { parseAndValidateCsv, buildTemplateCsv, MAX_CSV_FILE_SIZE_BYTES } from './csvParser';
import type { ParseResult } from './types';
import { ValidationMessage } from '../ValidationMessage';

export interface CsvDropZoneProps {
  /** Called when a file has been successfully read. */
  onParsed: (result: ParseResult, fileName: string, rawText: string) => void;
}

const ACCEPTED_MIME = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']);

/** Human-readable ceiling for size-reject copy (matches MAX_CSV_FILE_SIZE_BYTES). */
const MAX_CSV_FILE_SIZE_LABEL = '1 MB';

/**
 * CsvDropZone — drag-and-drop / click-to-browse CSV upload zone.
 *
 * Accessibility:
 * - The zone is a `<label>` wrapping a visually-hidden `<input type="file">`.
 *   This gives it a native visible label and means keyboard users can press
 *   Enter/Space to open the file picker without any extra JS.
 * - An `aria-live="polite"` region announces parse status to screen readers.
 * - The drop zone itself exposes `role="button"` so AT treats it as interactive.
 */
export const CsvDropZone: React.FC<CsvDropZoneProps> = ({ onParsed }) => {
  const [zoneState, setZoneState] = useState<UploadZoneState>('empty');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const [parsedRowCount, setParsedRowCount] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      // Validate extension / mime
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isCsv =
        ext === 'csv' ||
        ACCEPTED_MIME.has(file.type);
      if (!isCsv) {
        setZoneState('parse-error');
        setParseError('Only .csv files are accepted.');
        return;
      }

      // Reject oversized files before buffering the entire contents into memory.
      if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
        setZoneState('parse-error');
        setParseError(
          `File is too large. Maximum size is ${MAX_CSV_FILE_SIZE_LABEL}.`,
        );
        return;
      }

      setZoneState('parsing');
      setParseError(null);

      try {
        const text = await file.text();
        const result = parseAndValidateCsv(text);

        if (result.parseError) {
          setZoneState('parse-error');
          setParseError(result.parseError);
          return;
        }

        const rowCount = result.rows.length || 0;
        setParsedFileName(file.name);
        setParsedRowCount(rowCount);
        setZoneState('parsed');
        onParsed(result, file.name, text);
      } catch {
        setZoneState('parse-error');
        setParseError('Failed to read the file. Please try again.');
      }
    },
    [onParsed],
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoneState('dragging-over');
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoneState((prev) => (prev === 'dragging-over' ? 'empty' : prev));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        void processFile(file);
      } else {
        setZoneState('empty');
      }
    },
    [processFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
      // Reset so re-selecting the same file triggers onChange
      e.target.value = '';
    },
    [processFile],
  );

  // ── Template download ──────────────────────────────────────────────────────
  const handleTemplateDownload = useCallback(() => {
    const csv = buildTemplateCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fluxora-streams-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const zoneClass = [
    'csv-drop-zone',
    `csv-drop-zone--${zoneState}`,
  ].join(' ');

  const statusMessage = (() => {
    if (zoneState === 'parsing') return 'Parsing file…';
    if (zoneState === 'parse-error' && parseError) return parseError;
    if (zoneState === 'parsed' && parsedFileName) {
      return `${parsedFileName} — ${parsedRowCount} row${parsedRowCount !== 1 ? 's' : ''} detected`;
    }
    if (zoneState === 'dragging-over') return 'Drop to upload';
    return '';
  })();

  return (
    <div className="csv-drop-zone-wrapper">
      {/* ── Drop zone label ── */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label
        htmlFor="csv-file-input"
        className={zoneClass}
        aria-label="Upload CSV file. Drag and drop or click to browse."
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Upload icon */}
        <span className="csv-drop-zone__icon" aria-hidden="true">
          {zoneState === 'parsing' ? (
            <svg
              className="csv-drop-zone__spinner"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          ) : zoneState === 'parsed' ? (
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4"
              />
            </svg>
          ) : zoneState === 'parse-error' ? (
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
          ) : (
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              />
            </svg>
          )}
        </span>

        {zoneState !== 'parsing' && (
          <span className="csv-drop-zone__heading">
            {zoneState === 'dragging-over'
              ? 'Drop to upload'
              : zoneState === 'parsed'
                ? 'File uploaded'
                : 'Drag & drop your CSV here'}
          </span>
        )}

        {zoneState === 'parsing' && (
          <span className="csv-drop-zone__heading">Parsing file…</span>
        )}

        {zoneState !== 'dragging-over' && zoneState !== 'parsing' && zoneState !== 'parsed' && zoneState !== 'parse-error' && (
          <span className="csv-drop-zone__subtext">
            or click to browse files
          </span>
        )}

        {zoneState !== 'parsing' && zoneState !== 'dragging-over' && (
          <span className="csv-drop-zone__hint">
            Accepts .csv · max 500 rows · 1 MB
          </span>
        )}

        {/* Visually hidden file input */}
        <input
          ref={inputRef}
          id="csv-file-input"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Upload CSV file. Accepts .csv format, maximum 500 rows, 1 MB."
          aria-describedby="csv-upload-status"
          onChange={onFileChange}
        />
      </label>

      {/* ── Live status region (announced to screen readers) ── */}
      <div
        id="csv-upload-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="csv-drop-zone__live-region"
      >
        {statusMessage}
      </div>

      {/* Error shown below the zone as a ValidationMessage */}
      {zoneState === 'parse-error' && parseError && (
        <ValidationMessage
          id="csv-upload-error"
          message={parseError}
          type="error"
        />
      )}

      {/* Success file info */}
      {zoneState === 'parsed' && parsedFileName && (
        <ValidationMessage
          id="csv-upload-success"
          message={`${parsedFileName} — ${parsedRowCount} row${parsedRowCount !== 1 ? 's' : ''} detected`}
          type="success"
        />
      )}

      {/* ── Template download link ── */}
      <div className="csv-drop-zone__template">
        <button
          type="button"
          className="csv-template-link"
          onClick={handleTemplateDownload}
          aria-label="Download CSV template file"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
            />
          </svg>
          Download CSV template
        </button>
      </div>
    </div>
  );
};

export default CsvDropZone;
