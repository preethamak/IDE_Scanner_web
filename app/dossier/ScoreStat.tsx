export default function ScoreStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  const score = Math.max(0, Math.min(100, value));
  return <article className="scoreStat"><span>{label}</span><div className="scoreRing"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="17"/><circle className="scoreRingValue" cx="21" cy="21" r="17" pathLength="100" strokeDasharray={`${score} 100`}/></svg><strong>{score}</strong></div><p>{detail}</p></article>;
}
