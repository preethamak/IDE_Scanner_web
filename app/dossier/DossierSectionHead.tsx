export default function DossierSectionHead({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <header className="dossierHead"><span>{eyebrow}</span><h2>{title}</h2><p>{detail}</p></header>;
}
