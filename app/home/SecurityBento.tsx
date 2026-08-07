import Link from "next/link";
import { ArrowUpRight, BellRing, Code2, FileDiff, Fingerprint, Radar, ShieldCheck } from "lucide-react";
import styles from "./landing.module.css";

export default function SecurityBento() {
  return (
    <section className={styles.bentoSection} aria-labelledby="bento-heading">
      <div className={styles.sectionHeading}>
        <span className={styles.eyebrow}><i /> One security picture</span>
        <h2 id="bento-heading">Everything needed to make<br />a release decision.</h2>
        <p>GuardRails turns package details into a concise view of identity, behavior, evidence, and change.</p>
      </div>
      <div className={styles.bentoGrid}>
        <article className={styles.bentoPrimary}>
          <div className={styles.cardIcon}><Fingerprint /></div><span>Exact identity</span><h3>A report that cannot drift.</h3><p>Publisher, package, version, artifact hash, and scanner build stay attached to the result.</p>
          <div className={styles.identityTicket}><span>ARTIFACT</span><code>sha256: 8b45…19e2</code><b><ShieldCheck /> Verified</b></div>
        </article>
        <article className={styles.bentoCapabilities}>
          <div className={styles.cardIcon}><Code2 /></div><span>Capability map</span><h3>Behavior, grouped for humans.</h3>
          <div className={styles.orbit}><i /><i /><i /><strong>12</strong><span>signals</span></div>
        </article>
        <article className={styles.bentoChanges}>
          <div className={styles.cardIcon}><FileDiff /></div><span>Release diff</span><h3>Only the meaningful changes.</h3>
          <div className={styles.diffLines}><p><b>+</b> Process execution <em>new</em></p><p><b>+</b> api.vendor.com <em>new</em></p><p><i>~</i> 3 files modified</p></div>
        </article>
        <article className={styles.bentoMonitoring}>
          <div><div className={styles.cardIcon}><Radar /></div><span>Monitoring</span><h3>Quiet until a release deserves attention.</h3><p>Use the reviewed version as a baseline and route only meaningful changes back to an owner.</p><Link href="/monitor">See monitoring <ArrowUpRight /></Link></div>
          <div className={styles.notificationStack}><article><BellRing /><span><strong>New release detected</strong><small>Scanning version 1.4.0</small></span><time>Now</time></article><article><ShieldCheck /><span><strong>Comparison ready</strong><small>2 capabilities added</small></span><time>2m</time></article></div>
        </article>
      </div>
    </section>
  );
}
