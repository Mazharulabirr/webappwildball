export type InboxMessage = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
export type InboxProfile = { id: string; username: string; display_name: string | null };

export function friendIds(following: string[], followers: string[]): Set<string> {
  const incoming = new Set(followers);
  return new Set(following.filter(id => incoming.has(id)));
}

export function threadMessages(messages: InboxMessage[], me: string, other: string) {
  return messages.filter(message =>
    (message.sender_id === me && message.recipient_id === other) ||
    (message.sender_id === other && message.recipient_id === me));
}

export function requestIds(messages: InboxMessage[], me: string, friends: Set<string>) {
  return new Set(messages.flatMap(message => {
    const other = message.sender_id === me ? message.recipient_id : message.recipient_id === me ? message.sender_id : null;
    return other && other !== me && !friends.has(other) ? [other] : [];
  }));
}
