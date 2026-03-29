import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { CardHeader as CemiCardHeader } from './CardHeader';
import { cn } from '../../ui/utils';
import '../styles/theme.css';
import '../styles/bento-card.css';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  mdColSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  lgColSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3;
  title?: string;
  subtitle?: string;
  meta?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Magic Bento Card with glassmorphism and mouse-following radial gradient hover.
 * Inspired by ReactBits Magic Bento aesthetic.
 */
export function BentoCard({
  children,
  className,
  colSpan = 12,
  mdColSpan,
  lgColSpan,
  rowSpan = 1,
  title,
  subtitle,
  meta,
  footer,
  onClick,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
      card.addEventListener('mousemove', handleMouseMove);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setMousePosition({ x: 50, y: 50 });
      card.removeEventListener('mousemove', handleMouseMove);
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Generate Tailwind classes for responsive grid columns
  const gridColClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  };

  const mdGridColClasses = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
  };

  const lgGridColClasses = {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
    7: 'lg:col-span-7',
    8: 'lg:col-span-8',
    9: 'lg:col-span-9',
    10: 'lg:col-span-10',
    11: 'lg:col-span-11',
    12: 'lg:col-span-12',
  };

  const rowSpanClasses = {
    1: '',
    2: 'row-span-2',
    3: 'row-span-3',
  };

  const gridClasses = cn(
    gridColClasses[colSpan],
    mdColSpan && mdGridColClasses[mdColSpan],
    lgColSpan && lgGridColClasses[lgColSpan],
    rowSpanClasses[rowSpan]
  );

  return (
    <div
      ref={cardRef}
      className={cn(
        'bento-card-wrapper',
        gridClasses,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      style={{
        '--bento-glow-x': `${mousePosition.x}%`,
        '--bento-glow-y': `${mousePosition.y}%`,
        '--bento-glow-opacity': isHovered ? 1 : 0,
      } as React.CSSProperties}
    >
      <Card className="bento-card h-full flex flex-col">
        {(title || subtitle || meta) && (
          <CemiCardHeader
            title={title || ''}
            subtitle={subtitle}
            chip={meta ? { label: meta, variant: 'outline' } : undefined}
          />
        )}
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1">{children}</div>
          {footer && <div className="mt-auto pt-4">{footer}</div>}
        </CardContent>
        {/* Magic hover gradient overlay */}
        <div
          className="bento-card-glow"
          aria-hidden="true"
        />
      </Card>
    </div>
  );
}

