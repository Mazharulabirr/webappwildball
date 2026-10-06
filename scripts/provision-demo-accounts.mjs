import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const credentials = (await readFile(join(root, "demo-accounts.local.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(2)
  .map((line) => {
    const [username, email, password] = line.split(",");
    return { username, email, password };
  });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing Supabase public environment variables.");

const videosDir = join(root, "public", "videos");
const videoNames = (await readdir(videosDir)).filter((name) => /\.(mp4|webm|mov)$/i.test(name));
if (!videoNames.length) throw new Error("No video files found in public/videos.");

const captions = [
  "Court action from the Wildball demo collection. #basketball #hoops",
  "Putting in work. #basketballtraining #lockedin",
  "One more rep, one more bucket. #hoopers",
  "Outdoor run energy. #basketball",
  "Handles on display. #streetball",
];

for (const [index, account] of credentials.entries()) {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { username: account.username } },
  });

  let session = signUp.session;
  if (!session) {
    const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (signInError || !signIn.session) {
      throw new Error(`${account.username}: ${signUpError?.message || signInError?.message || "No active session. Disable Confirm email in Supabase Auth, then rerun."}`);
    }
    session = signIn.session;
  }

  const userId = session.user.id;
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    username: account.username,
    display_name: `Court Vision ${String(index + 1).padStart(2, "0")}`,
    bio: "Wildball demo hooper.",
    location: "Demo Court",
  });
  if (profileError) throw new Error(`${account.username}: ${profileError.message}`);

  const { count, error: postCountError } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", userId);
  if (postCountError) throw new Error(`${account.username}: ${postCountError.message}`);
  if (count) {
    console.log(`${account.username}: account and post already exist; skipped.`);
    continue;
  }

  const videoName = videoNames[index % videoNames.length];
  const file = await readFile(join(videosDir, videoName));
  const storagePath = `${userId}/demo-${String(index + 1).padStart(2, "0")}-${videoName}`;
  const { error: uploadError } = await supabase.storage.from("videos").upload(storagePath, file, { contentType: "video/mp4", upsert: false });
  if (uploadError) throw new Error(`${account.username}: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);
  const { error: postError } = await supabase.from("posts").insert({
    author_id: userId,
    caption: captions[index % captions.length],
    video_path: urlData.publicUrl,
    status: "published",
  });
  if (postError) throw new Error(`${account.username}: ${postError.message}`);
  console.log(`${account.username}: created with ${videoName}.`);
}
