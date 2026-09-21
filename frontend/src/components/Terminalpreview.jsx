import React, { useEffect, useRef, useState } from 'react';
import { CircleDot } from 'lucide-react';

const LINES = [
  '$ pushcloud deploy https://github.com/user/repo',
  'Cloning repository…',
  'Detected framework: Vite',
  'Installing dependencies…',
  'Build complete',
  'Live at pushcloud.app/xyz123'
];

const STEP_MS = 900; // time between each line appearing
const HOLD_MS = 2200; // pause on the finished state before looping

// Placeholder for the real product demo. Swap this component out for a
// muted autoplay <video> in the same bordered container once you have a
// screen recording — the layout won't need to change.
export default function TerminalPreview() {
  const [visible, setVisible] = useState(1);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (prefersReducedMotion.current) {
      setVisible(LINES.length);
      return;
    }

    let timeoutId;

    function advance(count) {
      if (count >= LINES.length) {
        timeoutId = setTimeout(() => advance(1), HOLD_MS);
        return;
      }
      timeoutId = setTimeout(() => {
        setVisible(count + 1);
        advance(count + 1);
      }, STEP_MS);
    }

    advance(1);
    return () => clearTimeout(timeoutId);
  }, []);

  const done = visible >= LINES.length;

  return (
    <div className="overflow-hidden rounded-md border border-ink-700 bg-ink-900/60 shadow-card">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-2.5">
        <span className="font-mono text-xs text-ink-300">logs:pushcloud-demo</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-brand-300">
          <CircleDot size={11} className="animate-pulse" />
          {done ? 'ready' : 'building'}
        </span>
      </div>

      <div className="flex h-44 flex-col justify-end gap-0.5 overflow-hidden px-4 py-4">
        {LINES.slice(0, visible).map((text, i) => {
          const isCommand = i === 0;
          const isLatest = i === visible - 1;

          return (
            <div
              key={i}
              className={`whitespace-pre-wrap font-mono text-[13px] leading-relaxed transition-colors duration-500 ${
                isCommand ? 'text-ink-400' : isLatest ? 'text-ok' : 'text-ink-500'
              }`}
            >
              {isCommand ? text : `✓ ${text}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}