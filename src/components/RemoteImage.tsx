/* eslint-disable @next/next/no-img-element */

'use client';

import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import { useEffect, useState } from 'react';

type RemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src: string;
  alt: string;
  /** Text used for fallbacks (Pollinations prompt + SVG placeholder label). */
  fallbackText?: string;
  /** If true, tries Pollinations first before falling back to an inline SVG. */
  enablePollinationsFallback?: boolean;
};

function normalizeSrc(src: string): string {
  const trimmed = src.trim();
  // Avoid mixed-content issues when a provider returns http:// URLs.
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`;
  return trimmed;
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildSvgFallbackDataUrl(label: string): string {
  const short = label.trim().slice(0, 60);
  const safe = escapeXml(short || 'Image unavailable');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="50%" stop-color="#1f2937"/>
          <stop offset="100%" stop-color="#0b1020"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
            font-size="32" fill="#e5e7eb">
        ${safe}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildPollinationsUrl(prompt: string): string {
  const q = encodeURIComponent(prompt.trim() || 'image');
  return `https://image.pollinations.ai/prompt/${q}?width=1024&height=1024&nologo=true`;
}

export default function RemoteImage({
  src,
  alt,
  fallbackText,
  enablePollinationsFallback = true,
  onError,
  ...props
}: RemoteImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => normalizeSrc(src));
  const [fallbackStep, setFallbackStep] = useState<0 | 1 | 2>(0);

  // Reset when the upstream src changes.
  useEffect(() => {
    setCurrentSrc(normalizeSrc(src));
    setFallbackStep(0);
  }, [src]);

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    // Preserve any consumer-provided handler.
    onError?.(e);

    const label = fallbackText || alt;

    if (fallbackStep === 0 && enablePollinationsFallback) {
      setFallbackStep(1);
      setCurrentSrc(buildPollinationsUrl(label));
      return;
    }

    if (fallbackStep < 2) {
      setFallbackStep(2);
      setCurrentSrc(buildSvgFallbackDataUrl(label));
    }
  };

  return <img src={currentSrc} alt={alt} onError={handleError} {...props} />;
}

