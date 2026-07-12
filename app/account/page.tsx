"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AtSign, LogOut, ShieldCheck } from "lucide-react";
import { browserDb } from "@/lib/supabase";

export default function AccountPage() {
  const db = browserDb(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [userEmail, setUserEmail] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { void db?.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || "")); }, [db]);
  async function signIn(create: boolean) { if (!db) { setMessage("Accounts will activate when the free Supabase project is connected."); return; } const result = create ? await db.auth.signUp({ email, password }) : await db.auth.signInWithPassword({ email, password }); if (result.error) setMessage(result.error.message); else { setUserEmail(result.data.user?.email || email); setMessage(create ? "Check your email to confirm the account." : "Signed in."); } }
  async function signOut() { await db?.auth.signOut(); setUserEmail(""); }
  return <main className="accountPage"><section className="accountIntro"><span>IDE Scanner account</span><h1>Public intelligence.<br/>Personal decisions.</h1><p>Browsing and scanning stay public. An account adds watchlists, durable history and team review without changing scanner evidence.</p></section>{userEmail ? <section className="accountPanel"><div className="signedIn"><ShieldCheck/><div><span>Signed in as</span><strong>{userEmail}</strong></div><button className="iconButton" onClick={signOut} title="Sign out"><LogOut/></button></div><div className="accountChoices"><Link href="/workspace"><span>Workspace</span><strong>Watchlists and scan history</strong><ArrowRight/></Link><Link href="/workspace#teams"><span>Teams</span><strong>Shared review and assignments</strong><ArrowRight/></Link></div></section> : <section className="accountPanel"><div className="authForm"><label><span>Email</span><div><AtSign/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label><span>Password</span><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label><div><button className="button buttonDark" onClick={() => void signIn(false)}>Sign in</button><button className="button buttonQuiet" onClick={() => void signIn(true)}>Create account</button></div>{message ? <p>{message}</p> : null}</div></section>}</main>;
}
