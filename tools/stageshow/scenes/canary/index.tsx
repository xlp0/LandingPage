import {
  Badge,
  Bar,
  Icon,
  LockScreen,
  Notification,
  Phone,
  Stage,
  Text,
  WALLPAPER,
  Window
} from '../../kit';
import './scene.css';

const NAV_WIDTHS = [48, 60, 42, 54, 38];
const METRIC_ROWS = [
  { label: 74, value: 42 },
  { label: 58, value: 48 },
  { label: 82, value: 38 },
  { label: 64, value: 44 },
  { label: 70, value: 40 }
];

export default function CanaryScene() {
  return (
    <Stage
      width={640}
      height={400}
      compact={{ below: 600, width: 358, height: 320 }}
      className="ssg-canary"
    >
      {(_state, _rect, layout) => (
        <>
          <Window url="lab.govtech.local" className="ssg-canary-window">
            <aside className="ssg-canary-sidebar">
              <span className="ssg-canary-wordmark">GovTech</span>
              {NAV_WIDTHS.map((w, idx) => (
                <div
                  key={idx}
                  className="ssg-canary-nav"
                  data-active={idx === 0 || undefined}
                >
                  <Bar w={10} h={10} r={3} tone={idx === 0 ? 4 : 2} />
                  <Bar w={w} h={5} tone={idx === 0 ? 4 : 2} />
                </div>
              ))}
            </aside>

            <div className="ssg-canary-main">
              <section className="ssg-canary-hero">
                <div className="ssg-canary-head">
                  <Text className="ssg-canary-label">Viewport</Text>
                  <Bar w={48} h={18} r={5} tone={1} />
                </div>
                <div className="ssg-canary-figure">
                  <Text className="ssg-canary-metric">393 × 852</Text>
                  <Badge tone="success">1:1 px</Badge>
                </div>
                <Bar w={84} h={5} tone={2} />
              </section>

              <div className="ssg-canary-list">
                <Bar w={64} h={6} tone={3} style={{ marginBottom: 10 }} />
                {METRIC_ROWS.map((row, idx) => (
                  <div key={idx} className="ssg-canary-row">
                    <Bar w={16} h={16} r={5} tone={2} />
                    <Bar w={row.label} tone={3} />
                    <Bar w={row.value} tone={2} style={{ marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            </div>
          </Window>

          {layout !== 'compact' && (
            <Phone width={236} frame="pro" dark wallpaper={WALLPAPER} className="ssg-canary-phone">
              <LockScreen size="satellite" stack="top">
                <Notification
                  icon={<Icon name="bolt" filled size={20} />}
                  title="Layout gate"
                  body="24 snapshots verified"
                />
              </LockScreen>
            </Phone>
          )}
        </>
      )}
    </Stage>
  );
}
