"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleUserRound, LogOut, Radar } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { browserDb } from "@/lib/supabase";

export default function HeaderAccount() {
  const db = useMemo(() => browserDb(), []);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void db?.auth.getUser().then(({ data }) => setUser(data.user));
    const listener = db?.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", escape);
    return () => { listener?.data.subscription.unsubscribe(); document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [db]);

  async function signOut() { await db?.auth.signOut(); setOpen(false); window.location.assign("/"); }

  return <div className="headerAccountSlot" ref={root}>
    {user === undefined ? <span className="headerAccountLoading" aria-label="Checking account"/> : user ? <>
      <button className="headerAccountButton" aria-label="Open account menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><CircleUserRound/></button>
      {open ? <div className="headerAccountMenu" role="menu"><span>Signed in</span><strong>{user.email || "IDE Scanner account"}</strong><Link role="menuitem" href="/workspace" onClick={() => setOpen(false)}><Radar/> Workspace</Link><button role="menuitem" onClick={() => void signOut()}><LogOut/> Sign out</button></div> : null}
    </> : <Link className="headerSignIn" href="/account">Sign in</Link>}
  </div>;
}
