import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const firstNames = ["Avery", "Jordan", "Maya", "Marcus", "Sofia", "Malik", "Riley", "Devin", "Kayla", "Andre", "Tiana", "Jalen", "Nia", "Isaiah", "Camila", "Darius", "Olivia", "Jamal", "Brianna", "Noah"];
const lastNames = ["Carter", "Williams", "Johnson", "Brown", "Davis"];
const cities = ["Brooklyn, NY", "Chicago, IL", "Atlanta, GA", "Los Angeles, CA", "Houston, TX", "Seattle, WA", "Miami, FL", "Philadelphia, PA", "Detroit, MI", "Oakland, CA"];
const captions = ["Early run before the city wakes up. #hoops", "Kept the camera rolling after practice. #basketball", "One more rep. #lockedin", "Weekend run energy. #streetball", "Work speaks louder. #hooperlife"];
const root = process.cwd();
const videoDir = join(root, "public", "seed-videos");
const videoNames = (await readdir(videoDir)).filter((name) => /\.(mp4|webm|mov)$/i.test(name));
if (!videoNames.length) throw new Error("No local videos found in public/videos.");

const { data: userPage, error: userError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (userError) throw userError;
const existingUsers = new Map(userPage.users.map((user) => [user.email, user]));
const generatedAvatarPath = "generated/demo-avatar-01.png";
const generatedAvatar = await readFile(join(root, "public", "assets", "avatars", "generated", "demo-avatar-01.png"));
const { error: avatarError } = await admin.storage.from("avatars").upload(generatedAvatarPath, generatedAvatar, { contentType: "image/png", upsert: true });
if (avatarError) throw avatarError;
const sharedVideos = [];
for (const videoName of videoNames) {
  const storagePath = `demo-library/${videoName}`;
  const { data: existing } = admin.storage.from("videos").getPublicUrl(storagePath);
  const file = await readFile(join(videoDir, videoName));
  const { error } = await admin.storage.from("videos").upload(storagePath, file, { contentType: "video/mp4", upsert: true });
  if (error) throw error;
  sharedVideos.push(existing.publicUrl);
}

for (let index = 0; index < 100; index += 1) {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length)];
  const username = `${firstName}${lastName}${String(index + 1).padStart(2, "0")}`.toLowerCase();
  const email = `${username}@wildball-demo.local`;
  let account = existingUsers.get(email);
  if (!account) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: `WildballDemo-${index + 1}-Secure!`, email_confirm: true, user_metadata: { username, fictional_demo: true } });
    if (error) throw new Error(`${username}: ${error.message}`);
    account = data.user;
  }
  const avatar = index === 0 ? admin.storage.from("avatars").getPublicUrl(generatedAvatarPath).data.publicUrl : `https://api.dicebear.com/9.x/personas/png?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  const { error: profileError } = await admin.from("profiles").upsert({ id: account.id, username, display_name: `${firstName} ${lastName}`, bio: `Fictional Wildball demo player. Catch me on the court.`, location: cities[index % cities.length], avatar_path: avatar });
  if (profileError) throw new Error(`${username}: ${profileError.message}`);
  const { count, error: countError } = await admin.from("posts").select("*", { count: "exact", head: true }).eq("author_id", account.id);
  if (countError) throw new Error(`${username}: ${countError.message}`);
  if (!count) {
    const { error: postError } = await admin.from("posts").insert({ author_id: account.id, caption: captions[index % captions.length], video_path: sharedVideos[index % sharedVideos.length], status: "published" });
    if (postError) throw new Error(`${username}: ${postError.message}`);
  } else {
    const { data: post, error: postLookupError } = await admin.from("posts").select("id").eq("author_id", account.id).order("created_at", { ascending: true }).limit(1).single();
    if (postLookupError) throw new Error(`${username}: ${postLookupError.message}`);
    const { error: postUpdateError } = await admin.from("posts").update({ video_path: sharedVideos[index], caption: captions[index % captions.length] }).eq("id", post.id);
    if (postUpdateError) throw new Error(`${username}: ${postUpdateError.message}`);
  }
  console.log(`${index + 1}/100 ${username}`);
}
