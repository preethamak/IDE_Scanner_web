type Dimension = { score?: number; status?: string; basis?: string; deductions?: unknown[] };

const labels: Record<string, string> = {
  behavior_safety: "Behavior safety",
  supply_chain_integrity: "Supply-chain integrity",
  dependency_health: "Dependency health",
  artifact_integrity: "Artifact integrity",
  publisher_project_health: "Publisher & project",
  analysis_confidence: "Analysis confidence",
};

export default function IntelligenceScores({ risk, malware, coverage, dimensions = {} }: { risk?: number | null; malware?: number | null; coverage?: number | null; dimensions?: Record<string, Dimension> }) {
  const available=Object.entries(labels).filter(([key])=>dimensions[key]?.score!==undefined&&dimensions[key]?.status!=="unknown");
  return <section id="scores" className="intelligenceScores"><header><span>Security scores</span><h2>Different questions need different measures.</h2><p>Risk and malware are diagnostic indexes where higher needs more attention. Security dimensions are health measures where higher is stronger.</p></header><div className="diagnosticScores"><Diagnostic label="Malware evidence" value={malware} tone="danger" description={Number(malware || 0) === 0 ? "No malicious evidence detected" : "Strength of correlated malicious evidence"}/><Diagnostic label="Operational risk" value={risk} tone="warning" description={Number(risk || 0) < 20 ? "Low review priority" : "Behavior requires review context"}/><Diagnostic label="Analysis confidence" value={coverage} tone="confidence" description="How much required analysis completed"/></div>{available.length?<div className="healthScores">{available.map(([key,label]) => <Health key={key} label={label} item={dimensions[key]}/>)}</div>:<div className="legacyScoreNotice"><strong>Legacy analysis format</strong><p>This report predates dimension scoring. Existing evidence remains available, but health dimensions cannot be reconstructed without rescanning the artifact.</p></div>}<p className="scoreLimit">These indexes rank deterministic evidence. They are not probabilities that an extension is safe or malicious.</p></section>;
}
function Diagnostic({label,value,tone,description}:{label:string;value?:number|null;tone:string;description:string}) { const known=value!==null&&value!==undefined&&Number.isFinite(Number(value)); const score=known?Math.max(0,Math.min(100,Number(value))):0; return <article className={`diagnosticScore ${tone}`}><div className="scoreDial" style={{"--score":score} as React.CSSProperties}><strong>{known?score:"?"}</strong><span>/100</span></div><div><h3>{label}</h3><p>{known?description:"Not assessed by this report version"}</p></div></article>; }
function Health({label,item}:{label:string;item?:Dimension}) { const known=item?.score!==undefined&&item.status!=="unknown"; const score=known?Math.max(0,Math.min(100,Number(item.score))):0; return <article><div><span>{label}</span><strong>{known?score:"Unknown"}</strong></div><div className="healthTrack"><i style={{width:`${score}%`}}/></div><p>{known?(item?.basis||`${item?.deductions?.length||0} evidence-backed deductions`):"Not emitted by this scanner version"}</p></article>; }
