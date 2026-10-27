import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowedPlayer = { id: string; username: string; display_name: string | null; location: string | null };
export type SocialPost = { id: string; author_id: string; caption: string; video_path: string; poster_path: string | null; created_at: string; author?: { username: string; display_name: string | null; avatar_path: string | null } };
export type FeedCursor = { id: string; created_at: string };

export async function getFollowing(client: SupabaseClient, userId: string): Promise<FollowedPlayer[]> {
  const players: FollowedPlayer[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("follows")
      .select("following_id, profile:profiles!follows_following_id_fkey(id,username,display_name,location)")
      .eq("follower_id", userId).order("following_id").range(offset, offset + 499);
    if (error) throw error;
    for (const row of data || []) {
      const profile = row.profile as unknown as FollowedPlayer | null;
      if (profile) players.push(profile);
    }
    if (!data || data.length < 500) return players;
  }
}

export async function setPlayerFollow(client: SupabaseClient, userId: string, playerId: string, following: boolean) {
  if (userId === playerId) throw new Error("You cannot follow your own account.");
  const request = following
    ? client.from("follows").upsert({ follower_id: userId, following_id: playerId }, { onConflict: "follower_id,following_id", ignoreDuplicates: true })
    : client.from("follows").delete().eq("follower_id", userId).eq("following_id", playerId);
  const { error } = await request;
  if (error) throw error;
}

export async function getFollowCounts(client: SupabaseClient, profileId: string) {
  const [following, followers] = await Promise.all([
    client.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
    client.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId)
  ]);
  if (following.error) throw following.error;
  if (followers.error) throw followers.error;
  return { following: following.count ?? 0, followers: followers.count ?? 0 };
}

export async function getProfileStats(client: SupabaseClient, profileId: string) {
  const [counts, likes] = await Promise.all([
    getFollowCounts(client, profileId),
    client.from("post_likes").select("post:posts!post_likes_post_id_fkey!inner(author_id)", { count: "exact", head: true }).eq("post.author_id", profileId)
  ]);
  if (likes.error) throw likes.error;
  return { ...counts, likes: likes.count ?? 0 };
}

export async function getFollowingPosts(client: SupabaseClient, playerIds: string[], cursor: FeedCursor | null = null, limit = 20) {
  const ids = [...new Set(playerIds)];
  if (!ids.length) return { posts: [] as SocialPost[], hasMore: false };
  // Chunk the author filter so accounts with many follows do not exceed URL
  // limits. Merge by the same stable cursor before selecting the next page.
  const requests = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    let request = client.from("posts")
      .select("id,author_id,caption,video_path,poster_path,created_at,author:profiles!posts_author_id_fkey(username,display_name,avatar_path)")
      .eq("status", "published").in("author_id", ids.slice(offset, offset + 100))
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
    if (cursor) request = request.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    requests.push(request);
  }
  const responses = await Promise.all(requests);
  for (const response of responses) if (response.error) throw response.error;
  const posts = responses.flatMap(response => (response.data || []) as unknown as SocialPost[])
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return { posts: posts.slice(0, limit), hasMore: posts.length > limit };
}
