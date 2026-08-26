"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import BrandMark from "@/app/BrandMark";
import type { Team } from "@/app/workspace/types";
import { initials, roleName } from "@/app/workspace/format";
import styles from "@/app/workspace/teamWorkspace.module.css";

export function WorkspaceSwitcher({
  teams,
  active,
  onChange,
}: {
  teams: Team[];
  active: Team;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.switcherWrap}>
      <button
        className={styles.switcher}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{initials(active.name)}</span>
        <div>
          <strong>{active.name}</strong>
          <small>{roleName(active.role)}</small>
        </div>
        <ChevronDown />
      </button>
      {open ? (
        <div
          className={styles.switcherMenu}
          role="listbox"
          aria-label="Switch workspace"
        >
          {teams.map((team) => (
            <button
              type="button"
              role="option"
              aria-selected={team.id === active.id}
              key={team.id}
              onClick={() => {
                onChange(team.id);
                setOpen(false);
              }}
            >
              <span>{initials(team.name)}</span>
              <div>
                <strong>{team.name}</strong>
                <small>{roleName(team.role)}</small>
              </div>
              {team.id === active.id ? <CheckCircle2 /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceLoading() {
  return (
    <main className={styles.loading}>
      <div className={styles.loadingBrand}>
        <BrandMark />
        <strong>GuardRails</strong>
      </div>
      <div>
        <span />
        <span />
        <span />
      </div>
      <p>Preparing your security workspace…</p>
    </main>
  );
}
