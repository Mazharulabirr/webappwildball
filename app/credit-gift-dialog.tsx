"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

const supabase = createClient();
const amounts = [50, 100, 250, 500, 1000];

export default function CreditGiftDialog({ recipientId, recipientName, onClose }: { recipientId:string; recipientName:string; onClose:()=>void }) {
  const [amount, setAmount] = useState(100), [balance, setBalance] = useState(0), [sending, setSending] = useState(false), [message, setMessage] = useState("");
  useEffect(() => { void (async()=>{ const {data:{user}}=await supabase.auth.getUser(); if(!user){location.assign("/login");return} const {data,error}=await supabase.from("credit_wallets").select("available_credits").eq("profile_id",user.id).maybeSingle(); if(error){setMessage("Credits need to be activated by the site owner first.");return} setBalance(data?.available_credits||0); })(); }, []);
  const send = async () => { setSending(true); setMessage(""); const {error}=await supabase.rpc("send_credits",{receiver_id:recipientId,credits:amount,client_request_id:crypto.randomUUID()}); setSending(false); if(error){setMessage(error.message.includes("Insufficient")?"You do not have enough credits.":error.message);return} setBalance(value=>value-amount); setMessage(`${amount} credits sent to ${recipientName}.`); };
  return <div className="credit-dialog-backdrop" onClick={onClose}><section className="credit-dialog" role="dialog" aria-modal="true" aria-labelledby="credit-dialog-title" onClick={event=>event.stopPropagation()}><button className="credit-dialog-close" onClick={onClose} aria-label="Close">×</button><p className="credit-kicker">SUPPORT A CREATOR</p><h2 id="credit-dialog-title">Send credits to {recipientName}</h2><div className="credit-balance"><span>Your available balance</span><strong>{balance.toLocaleString()} credits</strong></div><div className="credit-options">{amounts.map(value=><button key={value} className={amount===value?"selected":""} onClick={()=>setAmount(value)}>{value}</button>)}</div><button className="credit-send" disabled={sending||balance<amount} onClick={send}>{sending?"Sending…":`Send ${amount} credits`}</button>{message&&<p className="credit-message">{message}</p>}<small>Credits can only be redeemed after verified payouts are enabled. Transfers are final unless reversed by support.</small></section></div>;
}
