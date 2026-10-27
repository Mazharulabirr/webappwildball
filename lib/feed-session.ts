type Post = { id: string; created_at: string };
type Range = { pivot: string; after: string | null; wrapped: boolean; limit: number };

/** A feed shuffle seed, not an authentication token; works over local HTTP too. */
export function createFeedPivot(random: () => number = Math.random) {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const value = Math.floor(random() * 16);
    return (character === "x" ? value : (value & 3) | 8).toString(16);
  });
}

/** Traverse the indexed UUID keyspace from a fresh random point on each visit. */
export function createFeedSession<T extends Post>(pivot: string) {
  let after: string | null = null;
  let wrapped = false;
  let exhausted = false;
  let started = false;
  const seen = new Set<string>();
  return {
    async next(latest: () => Promise<T[]>, range: (options: Range) => Promise<T[]>) {
      // Commit pagination only after every query succeeds, so a retry cannot skip posts.
      let nextAfter = after, nextWrapped = wrapped, nextExhausted = exhausted;
      const [fresh, initial] = await Promise.all([
        started ? Promise.resolve([] as T[]) : latest(),
        exhausted ? Promise.resolve([] as T[]) : range({ pivot, after, wrapped, limit: started ? 12 : 9 }),
      ]);
      const discovery = [...initial];
      const requested = started ? 12 : 9;
      if (!exhausted) {
        nextAfter = initial.at(-1)?.id || after;
        if (initial.length < requested) {
          if (wrapped) nextExhausted = true;
          else {
            nextWrapped = true;
            const remaining = requested - initial.length;
            const head = await range({ pivot, after: null, wrapped: true, limit: remaining });
            discovery.push(...head);
            nextAfter = head.at(-1)?.id || null;
            nextExhausted = head.length < remaining;
          }
        }
      }
      // Three recent posts are spaced among discoveries; the newest leads the feed.
      const mixed = [...discovery];
      fresh.forEach((post, index) => mixed.splice(Math.min(index * 4, mixed.length), 0, post));
      const posts = mixed.filter(post => { if (seen.has(post.id)) return false; seen.add(post.id); return true; });
      after = nextAfter; wrapped = nextWrapped; exhausted = nextExhausted; started = true;
      return { posts, hasMore: !exhausted };
    },
  };
}
