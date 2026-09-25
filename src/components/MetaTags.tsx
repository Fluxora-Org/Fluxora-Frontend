import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { StreamRecord } from '../data/streamRecords';
import { formatAssetAmount } from '../lib/formatters';

interface MetaTagsProps {
  stream: StreamRecord;
}

/**
 * Generates per-stream Open Graph and Twitter meta tags for StreamDetail.tsx sharing.
 * Dynamically computes the server/edge OG image URL with timestamp cache-busting (?v=timestamp)
 * and rich accessible alt text annotations.
 */
export const MetaTags: React.FC<MetaTagsProps> = ({ stream }) => {
  const currentOrigin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://fluxora.app';

  // Support updatedAt or fallback to endDate timestamp for cache-busting
  const rawUpdatedAt = (stream as unknown as Record<string, unknown>).updatedAt;
  let cacheBustParam: number | null = null;

  if (typeof rawUpdatedAt === 'string' && rawUpdatedAt.trim().length > 0) {
    const parsed = Date.parse(rawUpdatedAt);
    if (Number.isFinite(parsed)) cacheBustParam = parsed;
  } else if (stream.endDate && typeof stream.endDate === 'string' && stream.endDate.trim().length > 0) {
    const parsed = Date.parse(stream.endDate);
    if (Number.isFinite(parsed)) cacheBustParam = parsed;
  }

  const ogImageUrl =
    cacheBustParam !== null
      ? `${currentOrigin}/og-image/${stream.id}.png?v=${cacheBustParam}`
      : `${currentOrigin}/og-image/${stream.id}.png`;

  const ogTitle = `${stream.name} – Fluxora`;
  const ogDescription =
    stream.summary && stream.summary.length > 0
      ? stream.summary
      : `Stream treasury capital on Stellar: ${formatAssetAmount(stream.monthlyRate, stream.asset)}/mo for ${stream.recipientName}.`;

  const ogAlt = `Fluxora stream ${stream.name}, status ${stream.status}, recipient ${stream.recipientName}, rate ${formatAssetAmount(stream.monthlyRate, stream.asset)}/mo`;

  return (
    <Helmet>
      <title>{ogTitle}</title>
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Fluxora" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={`${currentOrigin}/app/streams/${stream.id}`} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:alt" content={ogAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content={ogAlt} />
    </Helmet>
  );
};
