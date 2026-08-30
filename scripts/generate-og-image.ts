// scripts/generate-og-image.ts
import { ImageResponse } from '@vercel/og';
import { readFileSync } from 'fs';
import path from 'path';
import { getStreamRecord, StreamRecord } from '../src/data/streamRecords';

/**
 * Helper to truncate long Stellar addresses for clean rendering.
 */
function truncateAddress(address?: string): string {
  if (!address || address.length < 12) return address ?? '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Status pill color mappings adhering to WCAG 2.1 AA contrast standards.
 */
function getStatusPillStyle(status: string) {
  switch (status) {
      
    case 'Active':
      return {
        bg: '#064E3B',
        text: '#34D399',
        border: '1px solid #059669',
      };
    case 'Paused':
      return {
        bg: '#78350F',
        text: '#FBBF24',
        border: '1px solid #D97706',
      };
    case 'Completed':
    default:
      return {
        bg: '#334155',
        text: '#94A3B8',
        border: '1px solid #475569',
      };
  }
}

/**
 * Server-side / build-time Open Graph image handler (1200x630).
 */
export async function handler(req: Request) {
  const url = new URL(req.url);
  const streamId = url.pathname.replace(/^\/og-image\//, '').replace(/\.png$/, '');

  const record: StreamRecord | undefined = getStreamRecord(streamId);

  // Fallback stream object if record not found
  const stream = record ?? {
    id: streamId || 'STR-DEFAULT',
    name: 'Fluxora Treasury Stream',
    recipientName: 'Stream Recipient',
    recipientAddress: '',
    status: 'Active',
    monthlyRate: 0,
    asset: 'USDC',
    depositAmount: 0,
    progress: 0,
    startDate: '',
    endDate: '',
    summary: 'Streaming treasury capital on Stellar',
  };

  const pillStyle = getStatusPillStyle(stream.status);

  // Font loading setup
  let interBold: ArrayBuffer | null = null;
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
    interBold = readFileSync(fontPath);
  } catch {
    // Optional font loading fallback
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 60px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#F8FAFC',
          fontFamily: interBold ? 'Inter' : 'system-ui, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0EA5E9, #2563EB)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              F
            </div>
            <span style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', color: '#38BDF8' }}>
              FLUXORA
            </span>
          </div>

          {/* Status Pill */}
          <div
            style={{
              padding: '10px 24px',
              borderRadius: '9999px',
              backgroundColor: pillStyle.bg,
              color: pillStyle.text,
              border: pillStyle.border,
              fontSize: '20px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {stream.status}
          </div>
        </div>

        {/* Center Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '52px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
            {stream.name}
          </div>

          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            {/* Recipient info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94A3B8', letterSpacing: '1px' }}>
                RECIPIENT
              </span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#E2E8F0' }}>
                {stream.recipientName}
                {stream.recipientAddress ? ` (${truncateAddress(stream.recipientAddress)})` : ''}
              </span>
            </div>

            {/* Rate of accrual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94A3B8', letterSpacing: '1px' }}>
                ACCRUAL RATE
              </span>
              <span style={{ fontSize: '32px', fontWeight: 700, color: '#38BDF8' }}>
                {stream.monthlyRate.toLocaleString()} {stream.asset} / mo
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata & Fallback Row */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '24px',
            fontSize: '18px',
            color: '#94A3B8',
          }}
        >
          {/* Cliff date if present, otherwise progress fallback */}
          <div>
            {stream.cliffDate ? (
              <span>Cliff Date: <strong style={{ color: '#F8FAFC' }}>{stream.cliffDate}</strong></span>
            ) : (
              <span>Progress: <strong style={{ color: '#F8FAFC' }}>{stream.progress}%</strong></span>
            )}
          </div>

          {/* Schedule dates if present */}
          <div>
            {stream.startDate && stream.endDate ? (
              <span>{stream.startDate} → {stream.endDate}</span>
            ) : (
              <span>Stream ID: {stream.id}</span>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: interBold ? [{ name: 'Inter', data: interBold, weight: 700 }] : [],
    },
  );
}
