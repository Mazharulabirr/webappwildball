"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Program={currency:string;minor_units_per_credit:number;minimum_redemption_credits:number;redemptions_enabled:boolean};
type Transfer={id:string;sender_id:string;recipient_id:string;amount_credits:number;status:string;created_at:string};
type Redemption={id:string;amount_credits:number;currency:string;cash_amount_minor:number;status:string;created_at:string};
const supabase=createClient();
const fallback:Program={currency:"BDT",minor_units_per_credit:100,minimum_redemption_credits:1000,redemptions_enabled:false};

export default function WalletPage(){
  const router=useRouter();
  const [userId,setUserId]=useState(""),[available,setAvailable]=useState(0),[reserved,setReserved]=useState(0);
  const [program,setProgram]=useState<Program>(fallback),[amount,setAmount]=useState(1000),[loading,setLoading]=useState(true),[sending,setSending]=useState(false);
  const [transfers,setTransfers]=useState<Transfer[]>([]),[redemptions,setRedemptions]=useState<Redemption[]>([]),[notice,setNotice]=useState("");

  const load=async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/login");return}
    setUserId(user.id);
    const [{data:wallet,error:walletError},{data:settings},{data:activity},{data:requests}]=await Promise.all([
      supabase.from("credit_wallets").select("available_credits,reserved_credits").eq("profile_id",user.id).maybeSingle(),
      supabase.from("credit_program_settings").select("currency,minor_units_per_credit,minimum_redemption_credits,redemptions_enabled").eq("id",true).maybeSingle(),
      supabase.from("credit_transfers").select("id,sender_id,recipient_id,amount_credits,status,created_at").order("created_at",{ascending:false}).limit(12),
      supabase.from("credit_redemptions").select("id,amount_credits,currency,cash_amount_minor,status,created_at").order("created_at",{ascending:false}).limit(8)
    ]);
    if(walletError)setNotice("Wallet backend is not active yet. Run supabase/credits.sql in Supabase once.");
    setAvailable(Number(wallet?.available_credits||0));setReserved(Number(wallet?.reserved_credits||0));
    if(settings){const next=settings as Program;setProgram(next);setAmount(next.minimum_redemption_credits)}
    setTransfers((activity||[]) as Transfer[]);setRedemptions((requests||[]) as Redemption[]);setLoading(false);
  };
  useEffect(()=>{void load()},[]);

  const redeem=async()=>{
    if(!program.redemptions_enabled)return;
    setSending(true);setNotice("");
    const {error}=await supabase.rpc("request_credit_redemption",{credits:amount,client_request_id:crypto.randomUUID()});
    setSending(false);
    if(error){setNotice(error.message);return}
    setNotice("Redemption request submitted.");await load();
  };
  const money=(credits:number)=>new Intl.NumberFormat(undefined,{style:"currency",currency:program.currency,maximumFractionDigits:2}).format((credits*program.minor_units_per_credit)/100);

  return <main className="wallet-page">
    <div className="wallet-toolbar"><a className="wallet-back" href="/profile">← Profile</a><a href="/search">Send to a player</a></div>
    <header className="wallet-head"><p>WILDBALL CREATOR WALLET</p><h1>Wallet &amp; credits</h1><span>Send support to other players and track the credits you receive.</span></header>
    {loading?<div className="wallet-loading">Loading your wallet…</div>:<>
      <section className="wallet-grid"><article className="wallet-card"><span>Available balance</span><strong>{available.toLocaleString()}</strong><small>credits · {money(available)}</small></article><article className="wallet-card"><span>Pending redemption</span><strong>{reserved.toLocaleString()}</strong><small>credits · {money(reserved)}</small></article></section>
      <section className="wallet-send-card"><div><p>GIVE SUPPORT</p><h2>Send credits to a player</h2><span>Search by name or username, open their profile, then tap Send credits.</span></div><a href="/search">Find a player →</a></section>
      <section className="wallet-redeem"><h2>Redeem credits</h2><p>{program.redemptions_enabled?`Minimum ${program.minimum_redemption_credits.toLocaleString()} credits. Payout identity verification is required.`:"Cash redemption is not live yet. A verified payout/KYC provider must be connected before real-money withdrawals can open."}</p><label>Credits to redeem<input type="number" min={program.minimum_redemption_credits} step="50" value={amount} onChange={event=>setAmount(Number(event.target.value)||0)}/></label><div className="wallet-cash-preview">Estimated value <b>{money(amount)}</b></div><button disabled={sending||!program.redemptions_enabled||amount<program.minimum_redemption_credits||amount>available} onClick={()=>void redeem()}>{sending?"Submitting…":program.redemptions_enabled?"Request redemption":"Redemption unavailable"}</button></section>
      <section className="wallet-activity"><h2>Recent activity</h2>{!transfers.length&&!redemptions.length?<p>No credit activity yet.</p>:<>{transfers.map(item=><article key={item.id}><div><b>{item.sender_id===userId?"Credits sent":"Credits received"}</b><small>{new Date(item.created_at).toLocaleDateString()}</small></div><strong className={item.sender_id===userId?"sent":"received"}>{item.sender_id===userId?"−":"+"}{item.amount_credits}</strong></article>)}{redemptions.map(item=><article key={item.id}><div><b>Redemption · {item.status}</b><small>{new Date(item.created_at).toLocaleDateString()}</small></div><strong>−{item.amount_credits}</strong></article>)}</>}</section>
    </>}
    {notice&&<p className="wallet-notice">{notice}</p>}
  </main>;
}
