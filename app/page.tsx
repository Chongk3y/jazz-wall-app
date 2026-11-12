"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  author: string;
  author_id: string | null;
  content: string;
  image_url: string | null;
  image_urls: string[];
  created_at: string;
};

const messages: Post[] = [
  { id: "anna", author: "Anna", author_id: null, content: "Hey Jazz, did you debug your coffee maker yet? Last cup tasted like JavaScript errors.", image_url: null, image_urls: [], created_at: "2026-11-12T12:00:00Z" },
  { id: "adelaida", author: "Adelaida", author_id: null, content: "Jazz, saw your last coding session—pretty sure you broke Stack Overflow again! 🚨", image_url: null, image_urls: [], created_at: "2026-11-12T12:00:00Z" },
  { id: "juho", author: "Juho", author_id: null, content: "Jazz, are you still coding in pajamas, or have you upgraded to full-time sweatpants mode?", image_url: null, image_urls: [], created_at: "2026-11-12T12:00:00Z" },
  { id: "maija", author: "Maija", author_id: null, content: "Jazz, rumor has it your computer has more stickers than code running on it. Confirm?", image_url: null, image_urls: [], created_at: "2026-11-12T12:00:00Z" },
  { id: "alex", author: "Alex", author_id: null, content: "Yo Jazz, just pulled an all-nighter on the assignment. Turns out sleep deprivation doesn’t improve coding skills. Weird!", image_url: null, image_urls: [], created_at: "2026-11-12T12:00:00Z" },
  { id: "sheryl", author: "Sheryl", author_id: null, content: "Jazz, when are we gonna deploy your latest dance moves to production? #4gileDancer", image_url: null, image_urls: [], created_at: "2026-11-12T12:00:00Z" },
];

function formatPostAge(value: string, now: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0 minutes ago";
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / (1000 * 60)));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function getBentoImageClass(index: number, total: number) {
  if (total === 3 && index === 0) return "col-span-2 row-span-2";
  if (total === 4 && index === 0) return "row-span-2";
  if (total > 4 && index === 0) return "col-span-2";
  return "";
}

export default function Home() {
  const [now, setNow] = useState(() => Date.now());
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<Post[]>(messages);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [pendingProfilePhoto, setPendingProfilePhoto] = useState<File | null>(null);
  const [isSavingProfilePhoto, setIsSavingProfilePhoto] = useState(false);
  const [notePhotos, setNotePhotos] = useState<File[]>([]);
  const [notePhotoPreviews, setNotePhotoPreviews] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Add your Supabase environment variables to enable saved posts and photos.");
      return;
    }
    const client = supabase;

    let active = true;

    async function loadWall() {
      let { data: authData } = await client.auth.getUser();
      if (!authData.user) {
        const anonymousAuth = await client.auth.signInAnonymously();
        authData = anonymousAuth.data;
        if (anonymousAuth.error || !authData.user) {
          setErrorMessage(`Could not create a user session: ${anonymousAuth.error?.message ?? "No user returned"}`);
          return;
        }
      }

      setUserId(authData.user.id);

      const [{ data: remotePosts, error: postsError }, { data: profile, error: profileError }] =
        await Promise.all([
          client.from("posts").select("id, author, author_id, content, image_url, image_urls, created_at").order("created_at", { ascending: false }).limit(50),
          client.from("profiles").select("photo_url").eq("id", "greg").maybeSingle(),
        ]);

      if (!active) return;
      if (postsError) {
        setErrorMessage(`Could not load posts: ${postsError.message}`);
      } else if (remotePosts) {
        setPosts([...remotePosts, ...messages]);
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
    if (!userId) {
      setErrorMessage("Your user session is not ready yet. Please try again.");
      return;
    }
    const imageUrls: string[] = [];

    for (const [index, notePhoto] of notePhotos.entries()) {
      const extension = notePhoto.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `posts/post-${Date.now()}-${index}.${extension}`;
      const { error: uploadError } = await client.storage.from("post-photos").upload(path, notePhoto, { upsert: true });

      if (uploadError) {
        setErrorMessage(`Could not upload note photo: ${uploadError.message}`);
        return;
      }

      const { data: publicUrl } = client.storage.from("post-photos").getPublicUrl(path);
      imageUrls.push(publicUrl.publicUrl);
    }

    const { data, error } = await client
      .from("posts")
      .insert({ author: "Jazzer Ong", author_id: userId, content: text, image_url: imageUrls[0] ?? null, image_urls: imageUrls })
      .select("id, author, author_id, content, image_url, image_urls, created_at")
      .single();

    if (error) {
      setErrorMessage(`Could not publish note: ${error.message}`);
      return;
    }

    setPosts((current) => current.some((post) => post.id === data.id) ? current : [data, ...current]);
    setDraft("");
    notePhotoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setNotePhotos([]);
    setNotePhotoPreviews([]);
  }

  function handleNotePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setErrorMessage("Please select an image file.");
      return;
    }

    setNotePhotos((current) => [...current, ...files]);
    setNotePhotoPreviews((current) => [...current, ...files.map((file) => URL.createObjectURL(file))]);
  }

  function handleProfilePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file.");
      return;
    }

    if (profilePhoto?.startsWith("blob:")) URL.revokeObjectURL(profilePhoto);
    const previewUrl = URL.createObjectURL(file);
    setProfilePhoto(previewUrl);
    setPendingProfilePhoto(file);
    setErrorMessage(null);
  }

  async function saveProfilePhoto() {
    if (!pendingProfilePhoto) return;
    if (!supabase) {
      setErrorMessage("Supabase is not configured yet. Add your environment variables first.");
      return;
    }
    const client = supabase;
    setIsSavingProfilePhoto(true);

    const extension = pendingProfilePhoto.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `greg/profile-${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage.from("profile-photos").upload(path, pendingProfilePhoto, { upsert: true });

    if (uploadError) {
      setErrorMessage(`Could not upload photo: ${uploadError.message}`);
      setIsSavingProfilePhoto(false);
      return;
    }

    const { data: publicUrl } = client.storage.from("profile-photos").getPublicUrl(path);
    const { error: profileError } = await client
      .from("profiles")
      .upsert({ id: "greg", photo_url: publicUrl.publicUrl, updated_at: new Date().toISOString() });

    if (profileError) {
      setErrorMessage(`Could not save profile photo: ${profileError.message}`);
      setIsSavingProfilePhoto(false);
      return;
    }

    if (profilePhoto?.startsWith("blob:")) URL.revokeObjectURL(profilePhoto);
    setProfilePhoto(publicUrl.publicUrl);
    setPendingProfilePhoto(null);
    setIsSavingProfilePhoto(false);
    setErrorMessage(null);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-[1120px] items-center justify-between">
        <div className="flex items-center gap-1 text-xl font-extrabold tracking-[-0.04em]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#3478f6] text-white shadow-lg shadow-blue-200">W</span>
          ALL
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
                <span className="grid size-16 place-items-center rounded-full bg-white text-[#3478f6] shadow-sm"><ImagePlus size={30} strokeWidth={1.7} /></span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b7b9b]">Add photo</span>
                <span className="text-xs text-[#7b8aa6]">Click to upload</span>
              </div>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleProfilePhotoChange} />
          </label>
          {pendingProfilePhoto && (
            <Button className="mt-3 w-full" onClick={saveProfilePhoto} disabled={isSavingProfilePhoto}>
              {isSavingProfilePhoto ? "Saving..." : "Save photo"}
            </Button>
          )}
          <section className="profile-heading mt-6">
            <h1 className="m-0 text-3xl font-extrabold tracking-[-0.04em]">Jazzer Ong</h1>
          </section>
          <section className="sketch-card mt-6 overflow-hidden text-sm leading-[1.4]">
            <div className="border-b border-[#e6eaf0] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Information</div>
            <div className="space-y-6 px-5 py-5">
              <div><p className="m-0 font-bold">Networks</p><p className="m-0">Western Mindanao State University</p></div>
              <div><p className="m-0 font-bold">Current City</p><p className="m-0">Zamboanga City, Philippines</p></div>
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
              {notePhotoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {notePhotoPreviews.map((preview, index) => (
                    <img
                      key={preview}
                      src={preview}
                      alt={`Attached note preview ${index + 1}`}
                      onClick={() => setSelectedImage(preview)}
                      className="h-28 w-full cursor-zoom-in rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-[#e6eaf0] pt-3">
                <div className="flex items-center gap-3">
                  <label htmlFor="note-photo" title="Add a photo to your note" className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#3478f6] transition-colors hover:bg-[#eaf1ff]">
                    <ImagePlus size={20} />
                  </label>
                  <input id="note-photo" type="file" accept="image/*" multiple className="sr-only" onChange={handleNotePhotoChange} />
                  <span className="text-xs font-semibold text-[#667085]">{draft.length}/280</span>
                </div>
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
                <div className="flex items-baseline gap-3">
                  <h3 className="hand m-0 text-[24px] font-bold leading-[1.05]">{post.author}</h3>
                  <time
                    dateTime={post.created_at}
                    suppressHydrationWarning
                    className="text-xs font-medium text-[#8994a8]"
                  >
                    {formatPostAge(post.created_at, now)}
                  </time>
                </div>
                <p className="hand m-0 mt-1 text-[21px] leading-[1.18] sm:text-[22px]">{post.content}</p>
                {(post.image_urls?.length > 0 || post.image_url) && (
                  (() => {
                    const images = post.image_urls?.length > 0 ? post.image_urls : [post.image_url];
                    if (images.length === 1 && images[0]) {
                      return (
                        <div className="mt-3 flex max-w-xl justify-start rounded-xl bg-[#f4f7fb] p-1">
                          <img
                            src={images[0]}
                            alt="Photo attached to note"
                            onClick={() => setSelectedImage(images[0])}
                            className="max-h-96 max-w-full cursor-zoom-in rounded-lg object-contain"
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="mt-3 grid max-w-xl auto-rows-[120px] grid-cols-2 gap-2 overflow-hidden rounded-xl sm:auto-rows-[150px] sm:grid-cols-3">
                        {images.map((imageUrl, index) => imageUrl && (
                          <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={`Photo attached to note ${index + 1}`}
                            onClick={() => setSelectedImage(imageUrl)}
                            className={`h-full w-full cursor-zoom-in rounded-lg object-cover ${getBentoImageClass(index, images.length)}`}
                          />
                        ))}
                      </div>
                    );
                  })()
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-[#101828]/85 p-5"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            onClick={() => setSelectedImage(null)}
            className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X size={22} />
          </button>
          <img
            src={selectedImage}
            alt="Expanded photo preview"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

    </main>
  );
}
