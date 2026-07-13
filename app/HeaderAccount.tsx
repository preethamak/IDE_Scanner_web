"use client";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { CircleUserRound } from "lucide-react";
import { browserDb } from "@/lib/supabase";
export default function HeaderAccount(){const db=useMemo(()=>browserDb(),[]);const[signedIn,setSignedIn]=useState(false);useEffect(()=>{void db?.auth.getUser().then(({data})=>setSignedIn(Boolean(data.user)));const listener=db?.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));return()=>listener?.data.subscription.unsubscribe()},[db]);return signedIn?<Link className="headerAccount" href="/workspace"><CircleUserRound/> Workspace</Link>:<Link className="headerSignIn" href="/account">Sign in</Link>}
