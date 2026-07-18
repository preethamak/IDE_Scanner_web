/* Armor1-style speedometer gauge. Server-renderable (pure SVG, deterministic).
   `value` 0-100 drives the needle across a semicircle with low/mid/high zones. */

type Props = {
  value: number;
  label?: string;
  caption?: string;
  size?: number;
  /* Override the automatic band; used when the decision already implies a band. */
  band?: "low" | "mid" | "high" | "info";
  unit?: string;
};

const START = 180; // degrees, left of the semicircle
const SWEEP = 180; // total sweep to the right
const R = 80;
const CX = 100;
const CY = 100;
const STROKE = 16;

function polar(angleDeg: number, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

function arcPath(fromDeg: number, toDeg: number, radius = R) {
  const from = polar(fromDeg, radius);
  const to = polar(toDeg, radius);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  // sweep-flag 1 draws clockwise from START(180°) through 270° to 360°/0°.
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}

function autoBand(value: number): "low" | "mid" | "high" {
  if (value >= 66) return "high";
  if (value >= 33) return "mid";
  return "low";
}

export default function SeverityGauge({ value, label, caption, size = 200, band, unit }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const resolved = band ?? autoBand(clamped);
  const needleAngle = START + (clamped / 100) * SWEEP;
  const needleEnd = polar(needleAngle, R - 6);
  const bandClass = resolved;

  return (
    <div className="gauge" style={{ ["--gauge-size" as string]: `${size}px` }}>
      <div className="gauge-dial">
        <svg viewBox="0 0 200 116" role="img" aria-label={`${label || "Risk"}: ${clamped} of 100`}>
          {/* track */}
          <path className="gauge-track" d={arcPath(START, START + SWEEP)} strokeWidth={STROKE} />
          {/* zones: low 0-33, mid 33-66, high 66-100 */}
          <path className="gauge-zone gauge-zone-low" d={arcPath(START, START + SWEEP * 0.33)} strokeWidth={STROKE} />
          <path className="gauge-zone gauge-zone-mid" d={arcPath(START + SWEEP * 0.335, START + SWEEP * 0.66)} strokeWidth={STROKE} />
          <path className="gauge-zone gauge-zone-high" d={arcPath(START + SWEEP * 0.665, START + SWEEP)} strokeWidth={STROKE} />
          {/* needle */}
          <line className="gauge-needle" x1={CX} y1={CY} x2={needleEnd.x.toFixed(2)} y2={needleEnd.y.toFixed(2)} />
          <circle className="gauge-hub" cx={CX} cy={CY} r={6} />
        </svg>
        <div className="gauge-readout">
          <span className="gauge-value">{clamped}{unit ? <small>{unit}</small> : <small>/100</small>}</span>
          {label ? <span className={`gauge-band ${bandClass}`}>{label}</span> : null}
        </div>
      </div>
      {caption ? <p className="gauge-caption">{caption}</p> : null}
    </div>
  );
}
