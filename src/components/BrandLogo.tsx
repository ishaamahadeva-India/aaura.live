'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  variant?: 'default' | 'large' | 'small';
  showOm?: boolean;
  className?: string;
  href?: string;
}

export function BrandLogo({
  variant = 'default',
  showOm = true,
  className,
  href = '/',
}: BrandLogoProps) {
  const variantStyles: Record<NonNullable<BrandLogoProps['variant']>, { gap: string; omSize: string; fontSize: string }> = {
    small: { gap: 'gap-1', omSize: 'text-2xl', fontSize: '40px' },
    default: { gap: 'gap-1.5', omSize: 'text-[2.5rem]', fontSize: '56px' },
    large: { gap: 'gap-2', omSize: 'text-[3.5rem]', fontSize: '94px' },
  };

  const { gap, omSize, fontSize } = variantStyles[variant];
  const containerClassName = cn('inline-flex items-center', gap, className);
  const wordmark = (
    <span className="brand-wordmark" style={{ fontSize }}>
      {['A', 'A', 'U', 'R', 'A'].map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className={cn(
            'brand-letter',
            letter === 'A' && 'brand-letter--a'
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );

  // Use Link when href is provided, otherwise use div
  if (href) {
    return (
      <Link href={href} className={containerClassName}>
        {showOm && (
          <span
            className={cn(
              omSize,
              'font-serif text-primary drop-shadow-sm transition-transform hover:scale-105'
            )}
            style={{ fontFamily: 'serif' }}
            aria-hidden="true"
          >
            ॐ
          </span>
        )}
        {wordmark}
      </Link>
    );
  }

  return (
    <div className={containerClassName}>
      {showOm && (
        <span
          className={cn(
            omSize,
            'font-serif text-primary drop-shadow-sm transition-transform hover:scale-105'
          )}
          style={{ fontFamily: 'serif' }}
          aria-hidden="true"
        >
          ॐ
        </span>
      )}
      {wordmark}
    </div>
  );
}
