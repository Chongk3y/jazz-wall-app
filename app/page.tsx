"use client";

import { useEffect, useState } from "react";
import { Share2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  author: string;
  content: string;
  created_at: string;
};

const messages: Post[] = [
  { id: "anna", author: "Anna", content: "Hey Greg, did you debug your coffee maker yet? Last cup tasted like JavaScript errors.", created_at: "2026-01-06T12:00:00Z" },
  { id: "adelaida", author: "Adelaida", content: "Greg, saw your last coding session—pretty sure you broke Stack Overflow again! 🚨", created_at: "2026-01-05T12:00:00Z" },
  { id: "juho", author: "Juho", content: "Greg, are you still coding in pajamas, or have you upgraded to full-time sweatpants mode?", created_at: "2026-01-04T12:00:00Z" },
  { id: "maija", author: "Maija", content: "Greg, rumor has it your computer has more stickers than code running on it. Confirm?", created_at: "2026-01-03T12:00:00Z" },
  { id: "alex", author: "Alex", content: "Yo Greg, just pulled an all-nighter on the assignment. Turns out sleep deprivation doesn’t improve coding skills. Weird!", created_at: "2026-01-02T12:00:00Z" },
  { id: "sheryl", author: "Sheryl", content: "Greg, when are we gonna deploy your latest dance moves to production? #4gileDancer", created_at: "2026-01-01T12:00:00Z" },
];

export default function Home() {
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<Post[]>(messages);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Add your Supabase environment variables to enable saved posts and photos.");
      return;
    }
    const client = supabase;

    let active = true;

    async function loadWall() {
      const [{ data: remotePosts, error: postsError }, { data: profile, error: profileError }] =
        await Promise.all([
          client.from("posts").select("id, author, content, created_at").order("created_at", { ascending: false }),
          client.from("profiles").select("photo_url").eq("id", "greg").maybeSingle(),
        ]);

      if (!active) return;
      if (postsError) {
        setErrorMessage(`Could not load posts: ${postsError.message}`);
      } else if (remotePosts) {
        setPosts(remotePosts);
      }
      if (profileError) {
        setErrorMessage(`Could not load profile: ${profileError.message}`);
      } else if (profile?.photo_url) {
        setProfilePhoto(profile.photo_url);
      }
    }

    void loadWall();

    const channel = client
      .channel("wall-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const newPost = payload.new as Post;
        setPosts((current) => current.some((post) => post.id === newPost.id) ? current : [newPost, ...current]);
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, []);

  async function addPost() {
    const text = draft.trim();
    if (!text || text.length > 280) return;
    if (!supabase) {
      setErrorMessage("Supabase is not configured yet. Add the values from .env.local.example.");
      return;
    }
    const client = supabase;

    const { data, error } = await client
      .from("posts")
      .insert({ author: "You", content: text })
      .select("id, author, content, created_at")
      .single();

    if (error) {
      setErrorMessage(`Could not publish note: ${error.message}`);
      return;
    }

    setPosts((current) => current.some((post) => post.id === data.id) ? current : [data, ...current]);
    setDraft("");
  }

  async function handleProfilePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setProfilePhoto(previewUrl);
    if (!supabase) {
      setErrorMessage("Supabase is not configured, so this photo is only a temporary preview.");
      return;
    }
    const client = supabase;

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `greg/profile-${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage.from("profile-photos").upload(path, file, { upsert: true });

    if (uploadError) {
      setErrorMessage(`Could not upload photo: ${uploadError.message}`);
      return;
    }

    const { data: publicUrl } = client.storage.from("profile-photos").getPublicUrl(path);
    const { error: profileError } = await client
      .from("profiles")
      .upsert({ id: "greg", photo_url: publicUrl.publicUrl, updated_at: new Date().toISOString() });

    if (profileError) {
      setErrorMessage(`Could not save profile photo: ${profileError.message}`);
      return;
    }

    setProfilePhoto(publicUrl.publicUrl);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-[1120px] items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.04em]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#3478f6] text-white shadow-lg shadow-blue-200">w</span>
          wall
        </div>
        <span className="rounded-full border border-[#dfe5ee] bg-white/70 px-3 py-1 text-xs font-semibold text-[#667085]">Personal space</span>
      </header>

      <div className="wall-layout mx-auto mt-10 grid max-w-[1120px] grid-cols-[240px_minmax(0,1fr)] gap-10 sm:mt-14 lg:gap-16">
        <aside className="profile-column">
          <label className="profile-image group relative grid h-[220px] w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border border-[#dfe5ee] bg-gradient-to-br from-[#dce9ff] via-[#f2f6ff] to-[#e6e9f2] text-[#3478f6] shadow-inner">
            {profilePhoto ? (
              <>
                <img src={profilePhoto} alt="Profile preview" className="h-full w-full object-cover" />
                <span className="absolute inset-x-3 bottom-3 rounded-lg bg-[#172033]/75 px-3 py-2 text-center text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Change photo
                </span>
              </>
            ) : (
              <div className="grid place-items-center gap-2">
                <span className="grid size-16 place-items-center rounded-full bg-white text-[#3478f6] shadow-sm"><UserRound size={30} strokeWidth={1.7} /></span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b7b9b]">Add photo</span>
              </div>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleProfilePhotoChange} />
          </label>
          <section className="profile-heading mt-6">
            <h1 className="m-0 text-3xl font-extrabold tracking-[-0.04em]">Greg Wientjes</h1>
          </section>
          <section className="sketch-card mt-6 overflow-hidden text-sm leading-[1.4]">
            <div className="border-b border-[#e6eaf0] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Information</div>
            <div className="space-y-6 px-5 py-5">
              <div><p className="m-0 font-bold">Networks</p><p className="m-0">Stanford Alum</p></div>
              <div><p className="m-0 font-bold">Current City</p><p className="m-0">Palo Alto, CA</p></div>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          <div className="mt-3">
            <div className="new-post sketch-border mt-5 p-4 transition-colors focus-within:border-[#3478f6]">
              <textarea
                value={draft}
                maxLength={280}
                rows={3}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a note..."
                aria-label="Write a note"
                className="hand min-h-20 w-full resize-none bg-transparent text-lg font-bold text-[#172033] outline-none placeholder:text-[#3478f6] placeholder:opacity-80"
              />
              <div className="mt-2 flex items-center justify-between border-t border-[#e6eaf0] pt-3">
                <span className="text-xs font-semibold text-[#667085]">{draft.length}/280</span>
                <Button
                  className="items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={addPost}
                  disabled={!draft.trim()}
                >
                  <Share2 size={18} /> Share
                </Button>
              </div>
            </div>
            {errorMessage && (
              <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{errorMessage}</p>
            )}
          </div>

          <div className="mt-1">
            {posts.map((post) => (
              <article className="wall-line py-3" key={post.id}>
                <h3 className="hand m-0 text-[24px] font-bold leading-[1.05]">{post.author}</h3>
                <p className="hand m-0 mt-1 text-[21px] leading-[1.18] sm:text-[22px]">{post.content}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

    </main>
  );
}
