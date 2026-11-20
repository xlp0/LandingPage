import { useEffect, useState } from 'react';
import { Stage } from '../../kit/stage';
import type { LookTokens } from '../../kit/stage';
import type { Script } from '../../kit/act';
import type { Theme } from '../../kit/looks';
import { Bar, Text, Window } from '../../kit/window';
import { LockScreen, Notification, Phone, WALLPAPER } from '../../kit/phone';
import { Badge } from '../../kit/controls/Badge';
import { States } from '../../kit/motion/States';
import './scene.css';

declare const __SSG_DESKTOP_DIMS__: string;
declare const __SSG_PHONE_DIMS__: string;

type Phase = 'idle' | 'running' | 'transitioned' | 'verified';

interface PairState {
  phase: Phase;
  place: 'p_spa_overview' | 'p_spa_details';
  progressPct: number;
}

const DESKTOP_DIMS = typeof __SSG_DESKTOP_DIMS__ === 'string' ? __SSG_DESKTOP_DIMS__ : '1280 × 832';
const PHONE_DIMS = typeof __SSG_PHONE_DIMS__ === 'string' ? __SSG_PHONE_DIMS__ : '393 × 852';

const NAV_WIDTHS = [46, 56, 40, 50];
const FILLER_ROWS = [
  { name: 72, value: 38 },
  { name: 58, value: 44 },
  { name: 80, value: 34 },
  { name: 64, value: 42 }
];

const INITIAL: PairState = {
  phase: 'idle',
  place: 'p_spa_overview',
  progressPct: 18
};

const POSTER: PairState = {
  phase: 'verified',
  place: 'p_spa_details',
  progressPct: 100
};

function normalizeHostTheme(raw?: string | null): { theme: Theme; highContrast: boolean } {
  if (raw === 'high-contrast') {
    return { theme: 'dark', highContrast: true };
  }
  if (raw === 'dark') {
    return { theme: 'dark', highContrast: false };
  }
  return { theme: 'light', highContrast: false };
}

function resolveInitialRawTheme(initialTheme?: string): string {
  const film =
    typeof window !== 'undefined'
      ? (window as unknown as { __stageshow?: { theme?: string } }).__stageshow
      : undefined;
  if (film?.theme) return film.theme;
  if (initialTheme) return initialTheme;
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.theme) {
    return document.documentElement.dataset.theme;
  }
  return 'light';
}

const script: Script<PairState> = async (a) => {
  // Beat 1: Initial ready frame
  a.mark('ready');
  await a.wait(1400);

  // Beat 2: Trigger Bombadil handle on workbench window
  a.mark('trigger');
  await a.move('trigger', { duration: 500 });
  await a.click('trigger');
  await a.set({ phase: 'running', progressPct: 58 });
  await a.wait(1800);

  // Beat 3: Satellite phone transitions across target Petri net places
  a.mark('transition');
  await a.set({ phase: 'transitioned', place: 'p_spa_details', progressPct: 86 });
  await a.wait(2200);

  // Beat 4: Payoff verdict settled
  a.mark('verified');
  await a.set(POSTER);
  await a.wait(4800);

  // Smooth loop return before next cycle
  await a.set(INITIAL);
  await a.wait(900);
};

export interface WorkbenchBombadilPairProps {
  initialTheme?: string;
}

export default function WorkbenchBombadilPair({ initialTheme }: WorkbenchBombadilPairProps) {
  const [resolved, setResolved] = useState(() => normalizeHostTheme(resolveInitialRawTheme(initialTheme)));

  useEffect(() => {
    const sync = (nextTheme?: string) => {
      setResolved(normalizeHostTheme(nextTheme ?? resolveInitialRawTheme(initialTheme)));
    };
    const onPresentationChange = (ev: Event) => {
      const custom = ev as CustomEvent<{ theme?: string }>;
      sync(custom?.detail?.theme);
    };
    document.addEventListener('lab:presentation-change', onPresentationChange);
    sync();
    return () => {
      document.removeEventListener('lab:presentation-change', onPresentationChange);
    };
  }, [initialTheme]);

  const stageTheme: Theme = resolved.theme;
  const highContrastTokens: LookTokens | undefined = resolved.highContrast
    ? {
        '--ss-canvas': '#000000',
        '--ss-surface': '#0a0a0a',
        '--ss-well': '#111111',
        '--ss-chrome': '#0a0a0a',
        '--ss-raised': '#1a1a1a',
        '--ss-text-strong': '#ffffff',
        '--ss-text': '#f8fafc',
        '--ss-text-faint': '#cbd5e1',
        '--ss-line': '#ffffff',
        '--ss-line-faint': 'rgba(255, 255, 255, 0.35)',
        '--ss-accent': '#38bdf8',
        '--ss-success': '#4ade80'
      }
    : undefined;

  return (
    <Stage
      width={720}
      height={340}
      compact={{ below: 600, width: 358, height: 320 }}
      theme={stageTheme}
      tokens={highContrastTokens}
      initial={INITIAL}
      poster={POSTER}
      script={script}
      cursor={{ at: { wide: 'trigger', compact: 'trigger' }, ripple: false }}
      className="ssg-pair"
    >
      {(s, _rect, layout) => (
        <>
          <Window url="lab.govtech.local" className="ssg-pair-window">
            <aside className="ssg-pair-sidebar">
              <span className="ssg-pair-wordmark">GovTech</span>
              {NAV_WIDTHS.map((w, i) => (
                <div key={i} className="ssg-pair-nav" data-active={i === 0 || undefined}>
                  <Bar w={10} h={10} r={3} tone={i === 0 ? 4 : 2} />
                  <Bar w={w} h={5} tone={i === 0 ? 4 : 2} />
                </div>
              ))}
            </aside>

            <div className="ssg-pair-main">
              <section className="ssg-pair-hero">
                <div className="ssg-pair-head">
                  <Text className="ssg-pair-label">Bombadil spa</Text>
                  <Badge tone={s.phase === 'verified' ? 'success' : s.phase === 'idle' ? 'neutral' : 'accent'}>
                    <States
                      value={s.phase === 'idle' ? 'idle' : s.phase === 'verified' ? 'verified' : 'running'}
                      states={{
                        idle: 'Idle',
                        running: 'Running',
                        verified: 'Verified'
                      }}
                    />
                  </Badge>
                </div>

                <Text className="ssg-pair-metric">{DESKTOP_DIMS}</Text>

                <div className="ssg-pair-progress-track">
                  <div
                    className="ssg-pair-progress-fill"
                    data-phase={s.phase}
                    style={{ width: `${s.progressPct}%` }}
                  />
                </div>

                <div className="ssg-pair-actions">
                  <span className="ssg-pair-trigger" data-target="trigger" role="button">
                    Trigger handle
                  </span>
                </div>
              </section>

              {layout === 'compact' && (
                <div className="ssg-pair-compact-target">
                  <Text className="ssg-pair-compact-dims">{PHONE_DIMS}</Text>
                  <Badge tone={s.place === 'p_spa_details' ? 'success' : 'neutral'}>
                    <States
                      value={s.place}
                      align="center"
                      states={{
                        p_spa_overview: 'p_spa_overview',
                        p_spa_details: 'p_spa_details',
                      }}
                    />
                  </Badge>
                </div>
              )}

              <div className="ssg-pair-list">
                {FILLER_ROWS.slice(0, layout === 'compact' ? 2 : 4).map((row, idx) => (
                  <div key={idx} className="ssg-pair-row">
                    <Bar w={14} h={14} r={4} tone={2} />
                    <Bar w={row.name} tone={3} />
                    <Bar w={row.value} tone={2} style={{ marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            </div>
          </Window>

          {layout !== 'compact' && (
            <Phone
              width={232}
              frame="pro"
              dark={stageTheme === 'dark'}
              wallpaper={WALLPAPER}
              className="ssg-pair-phone"
            >
              <LockScreen size="satellite" stack="top">
                <Notification
                  className="ssg-pair-notif"
                  icon={
                    <svg viewBox="0 0 16 16" width={20} height={20} className="ss-icon" aria-hidden>
                      <path
                        d="M9.6 1.2 3.2 8.9a.6.6 0 0 0 .5 1H7.4l-1 4.9a.4.4 0 0 0 .7.3l6.4-7.7a.6.6 0 0 0-.5-1H9.3l1-4.9a.4.4 0 0 0-.7-.3Z"
                        fill="currentColor"
                      />
                    </svg>
                  }
                  title={s.place === 'p_spa_details' ? 'SPA Verified' : 'SPA Overview'}
                  body={`${s.place} • ${PHONE_DIMS}`}
                />
              </LockScreen>
            </Phone>
          )}
        </>
      )}
    </Stage>
  );
}
