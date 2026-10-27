"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { friendIds, requestIds, threadMessages, type InboxMessage, type InboxProfile } from "../../lib/inbox";
import { setPlayerFollow } from "../../lib/social";
import { notifyFollowChange, useSocialRefresh } from "../../lib/use-social-refresh";

const supabase = createClient();
type Folder = "friends" | "requests";

export default function InboxPage() {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [people, setPeople] = useState<InboxProfile[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [folder, setFolder] = useState<Folder>("friends");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const busy = useRef(false), initialized = useRef(false), sendBusy = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/login"); return; }
      // Page reads so larger follow lists and conversations keep their routing.
      async function readRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
        const rows: T[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await query(offset, offset + 499);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < 500) return rows;
        }
      }
      const [outgoing, incoming, sent, received] = await Promise.all([
        readRows<{ following_id: string }>((from, to) => supabase.from("follows").select("following_id").eq("follower_id", user.id).order("following_id").range(from, to)),
        readRows<{ follower_id: string }>((from, to) => supabase.from("follows").select("follower_id").eq("following_id", user.id).order("follower_id").range(from, to)),
        readRows<InboxMessage>((from, to) => supabase.from("direct_messages").select("id,sender_id,recipient_id,body,created_at").eq("sender_id", user.id).order("created_at").order("id").range(from, to)),
        readRows<InboxMessage>((from, to) => supabase.from("direct_messages").select("id,sender_id,recipient_id,body,created_at").eq("recipient_id", user.id).order("created_at").order("id").range(from, to)),
      ]);
      const nextFollowing = outgoing.map(row => row.following_id), nextFollowers = incoming.map(row => row.follower_id);
      const friends = friendIds(nextFollowing, nextFollowers);
      const allMessages = [...sent, ...received].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
      const requested = new URLSearchParams(window.location.search).get("to");
      const ids = [...new Set([...friends, ...requestIds(allMessages, user.id, friends), ...(requested && requested !== user.id ? [requested] : [])])];
      const profiles: InboxProfile[] = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await supabase.from("profiles").select("id,username,display_name").in("id", ids.slice(offset, offset + 100));
        if (error) throw error;
        profiles.push(...(data || []));
      }
      profiles.sort((a, b) => a.username.localeCompare(b.username));
      setMe(user.id); setFollowing(nextFollowing); setFollowers(nextFollowers); setPeople(profiles); setMessages(allMessages);
      if (!initialized.current) {
        const first = profiles.find(person => person.id === requested) || profiles.find(person => friends.has(person.id));
        if (first) { setSelected(first.id); setFolder(friends.has(first.id) ? "friends" : "requests"); }
        initialized.current = true;
      }
    } catch {
      setNotice("Could not load your inbox. Please refresh to try again.");
    } finally { busy.current = false; setLoading(false); }
  }, [router]);

  useEffect(() => { void load(); const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 8000); return () => window.clearInterval(timer); }, [load]);
  useSocialRefresh(() => { void load(); });
  const friends = useMemo(() => friendIds(following, followers), [following, followers]);
  const requests = useMemo(() => requestIds(messages, me, friends), [messages, me, friends]);
  const selectedPerson = people.find(person => person.id === selected);
  const isFriend = friends.has(selected);
  const thread = useMemo(() => threadMessages(messages, me, selected), [messages, me, selected]);
  const contacts = people.filter(person => folder === "friends" ? friends.has(person.id) : requests.has(person.id) || (person.id === selected && !friends.has(person.id)));
  const incomingRequest = !isFriend && thread.some(message => message.recipient_id === me);
  useEffect(() => { if (selected) setFolder(isFriend ? "friends" : "requests"); }, [selected, isFriend]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [selected, thread.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !me || !selectedPerson || sendBusy.current) return;
    sendBusy.current = true; setSending(true); setNotice("");
    const recipient = selectedPerson.id;
    try {
      const { error } = await supabase.from("direct_messages").insert({ sender_id: me, recipient_id: recipient, body });
      if (error) throw error;
      setDraft("");
      await load();
    } catch { setNotice("Message could not be sent. Your draft is still here; try again."); }
    finally { sendBusy.current = false; setSending(false); }
  };

  const followBack = async () => {
    if (followBusy || !selectedPerson) return;
    setFollowBusy(true);
    try {
      await setPlayerFollow(supabase, me, selectedPerson.id, true);
      setFollowing(current => [...new Set([...current, selectedPerson.id])]);
      if (followers.includes(selectedPerson.id)) setFolder("friends");
      notifyFollowChange();
    } catch { setNotice("Could not follow this player. Please try again."); }
    finally { setFollowBusy(false); }
  };

  const openFolder = (next: Folder) => { setFolder(next); setSelected(""); setDraft(""); };
  return <main className="inbox-page inbox-modern inbox-friends">
    <aside className="inbox-list">
      <div className="inbox-title">
        <a href="/" className="inbox-back inbox-tool" aria-label="Back to Wildball" title="Back to Wildball"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></a>
        <div><small>MESSAGES</small><h1>Inbox</h1></div>
        <button className="inbox-tool" type="button" onClick={() => { setNotice(""); void load(); }} aria-label="Refresh inbox" title="Refresh inbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 0-2.3 5.7M20 7l-2.3-2.3"/></svg></button>
      </div>
      <div className="inbox-folders" aria-label="Message folders">
        <button type="button" disabled={sending} aria-pressed={folder === "friends"} onClick={() => openFolder("friends")}>Friends <span>{friends.size}</span></button>
        <button type="button" disabled={sending} aria-pressed={folder === "requests"} onClick={() => openFolder("requests")}>Requests <span>{requests.size}</span></button>
      </div>
      <div className="conversation-list real-conversations">
        {contacts.map(person => {
          const latest = threadMessages(messages, me, person.id).at(-1);
          return <button key={person.id} type="button" disabled={sending} className={selected === person.id ? "active" : ""} onClick={() => { setSelected(person.id); setDraft(""); }}>
            <span>{(person.display_name || person.username)[0].toUpperCase()}</span>
            <b>{person.display_name || person.username}<small>{latest ? `${latest.sender_id === me ? "You: " : ""}${latest.body}` : friends.has(person.id) ? "Start a conversation" : "Send a message request"}</small></b>
          </button>;
        })}
      </div>
      {!contacts.length && <p className="inbox-folder-empty">{loading ? "Loading messages…" : folder === "friends" ? "Follow each other to become friends. Other messages appear in Requests." : "No message requests yet."}</p>}
    </aside>
    <section className="chat-window">
      {selectedPerson ? <>
        <header><span>{(selectedPerson.display_name || selectedPerson.username)[0].toUpperCase()}</span><div><b>{selectedPerson.display_name || selectedPerson.username}</b><small>{isFriend ? "Friends · You follow each other" : "Message request · You are not friends yet"}</small></div></header>
        <div className="chat-messages">
          {!isFriend && <div className="message-request-banner"><strong>{incomingRequest ? "Message request" : "This conversation is a request"}</strong><p>Messages stay in Requests until you both follow each other.</p>{!following.includes(selected) && <button type="button" disabled={followBusy} onClick={() => void followBack()}>{followBusy ? "Saving…" : followers.includes(selected) ? "Follow back to become friends" : "Follow player"}</button>}{following.includes(selected) && <small>Waiting for this player to follow you back.</small>}</div>}
          {thread.length ? thread.map(message => <p className={message.sender_id === me ? "mine" : "theirs"} key={message.id}>{message.body}<small>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></p>) : <div className="empty-chat"><h2>{isFriend ? "Start the conversation" : "Send a message request"}</h2><p>{isFriend ? `Say hello to ${selectedPerson.display_name || selectedPerson.username}.` : "Your message will appear in their Requests."}</p></div>}
          <div ref={endRef}/>
        </div>
        <form onSubmit={event => { event.preventDefault(); void send(); }}><input aria-label={isFriend ? "Message" : "Message request"} disabled={sending} value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} placeholder={isFriend ? "Write a message…" : "Write a message request…"}/><button disabled={!draft.trim() || sending || !me}>{sending ? "Sending…" : "Send"}<span>↑</span></button></form>
      </> : <div className="empty-chat inbox-no-selection"><h2>{folder === "friends" ? "Your friends, your conversations" : "Message requests"}</h2><p>{folder === "friends" ? "Select a friend to chat, or open a player's profile to send a request." : "Messages from players who are not mutual followers appear here."}</p><a href="/search">Find a player →</a></div>}
    </section>
    {notice && <p role="alert" className="inbox-notice">{notice}</p>}
  </main>;
}
