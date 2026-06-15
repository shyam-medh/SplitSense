'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders children directly into document.body via a React Portal.
 * This bypasses any stacking context or transform set on ancestor elements,
 * ensuring `fixed` positioned overlays always cover the full viewport.
 */
export function ModalPortal({ children }: ModalPortalProps) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement('div');
  }

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    // Lock body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.removeChild(el);
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(children, elRef.current);
}
