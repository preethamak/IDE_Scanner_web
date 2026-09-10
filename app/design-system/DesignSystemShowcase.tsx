"use client";

import { useState } from "react";
import { ArrowRight, Bell, Plus, ShieldCheck, Sparkles } from "lucide-react";
import Badge from "@/app/ui/Badge";
import Button from "@/app/ui/Button";
import DataTable from "@/app/ui/DataTable";
import Dialog from "@/app/ui/Dialog";
import Field from "@/app/ui/Field";
import IconButton from "@/app/ui/IconButton";
import PageHeader from "@/app/ui/PageHeader";
import StatePanel from "@/app/ui/StatePanel";
import Surface from "@/app/ui/Surface";
import Tabs from "@/app/ui/Tabs";
import styles from "./page.module.css";

const releases = [{ id: "prettier", extension: "Prettier", version: "11.0.0", status: "Analyzed" }, { id: "copilot", extension: "GitHub Copilot", version: "1.252", status: "Review" }, { id: "python", extension: "Python", version: "2026.8", status: "Analyzed" }];
export default function DesignSystemShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return <main className={styles.page}><div className={styles.glow} /><PageHeader eyebrow="Interface system · 01" title={<>Security decisions, <span>without the noise.</span></>} description="A dark, precise component foundation for public extension intelligence and daily team review." actions={<><Button href="/registry" trailingIcon={<ArrowRight />}>Check an extension</Button><Button tone="secondary" icon={<Sparkles />} onClick={() => setDialogOpen(true)}>Open dialog</Button><IconButton label="View notifications"><Bell /></IconButton></>} />
  <section><div className={styles.sectionHeading}><div><span>Core actions</span><h2>One interaction language</h2></div><p>Typed intent and size variants replace route-specific control styling.</p></div><Surface variant="raised" padding="lg"><div className={styles.row}><Button>Primary action</Button><Button tone="secondary" icon={<Plus />}>Add extension</Button><Button tone="outline">Outline</Button><Button tone="ghost">Ghost</Button><Button tone="danger">Block release</Button><IconButton label="Security status"><ShieldCheck /></IconButton></div><div className={styles.row}><Badge tone="allow">Analyzed</Badge><Badge tone="review">Attention needed</Badge><Badge tone="block">Policy blocked</Badge><Badge tone="info">Analysis running</Badge><Badge>Not scanned</Badge></div></Surface></section>
  <section><div className={styles.sectionHeading}><div><span>Inputs & navigation</span><h2>Accessible by default</h2></div><p>Labels, descriptions, error states, and roving keyboard focus are component behavior.</p></div><div className={styles.twoColumn}><Surface padding="lg"><div className={styles.formGrid}><Field label="Extension ID" description="Publisher and package name from the marketplace." placeholder="esbenp.prettier-vscode" /><Field label="Review note" multiline placeholder="Add context for your team…" /><Field label="Policy name" defaultValue="Production editors" error="A policy with this name already exists." /></div></Surface><Surface padding="lg"><Tabs items={[{ id: "overview", label: "Overview", content: <p className={styles.panelCopy}>Behavior changes and permission evidence stay together in one calm review surface.</p> }, { id: "evidence", label: "Evidence", content: <p className={styles.panelCopy}>Evidence is linked to a version and scan, never presented as an unsupported verdict.</p> }, { id: "history", label: "History", content: <p className={styles.panelCopy}>Keyboard users can move between tabs with arrow, Home, and End keys.</p> }]} /></Surface></div></section>
  <section><div className={styles.sectionHeading}><div><span>Dense information</span><h2>Product states and data</h2></div><p>Responsive tables and empty states share the same semantic token vocabulary.</p></div><DataTable caption="Recently reviewed extension releases" rows={releases} getRowKey={(row) => row.id} columns={[{ key: "extension", header: "Extension", cell: (row) => <strong className={styles.tableStrong}>{row.extension}</strong> }, { key: "version", header: "Version", cell: (row) => row.version }, { key: "status", header: "Status", cell: (row) => <Badge tone={row.status === "Review" ? "review" : "allow"}>{row.status}</Badge> }]} /><div className={styles.stateGrid}><StatePanel title="No releases need review" body="GuardRails will bring your team back when monitored behavior changes." action={{ label: "Find an extension", href: "/registry" }} /><StatePanel state="error" title="Monitoring could not refresh" body="The last successful result remains visible while you retry." action={{ label: "Try again" }} /></div></section>
  <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create monitoring policy" description="Choose the extension behavior that should bring your team back for review." actions={<><Button tone="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => setDialogOpen(false)}>Create policy</Button></>}><Field label="Policy name" autoFocus placeholder="Production editor baseline" /></Dialog></main>;
}
