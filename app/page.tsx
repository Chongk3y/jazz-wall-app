"use client";

import { useState } from "react";
import { Send, Share2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const messages = [
  ["Anna", "Hey Greg, did you debug your coffee maker yet? Last cup tasted like JavaScript errors."],
  ["Adelaida", "Greg, saw your last coding session—pretty sure you broke Stack Overflow again! 🚨"],
  ["Juho", "Greg, are you still coding in pajamas, or have you upgraded to full-time sweatpants mode?"],
  ["Maija", "Greg, rumor has it your computer has more stickers than code running on it. Confirm?"],
  ["Alex", "Yo Greg, just pulled an all-nighter on the assignment. Turns out sleep deprivation doesn’t improve coding skills. Weird!"],
  ["Sheryl", "Greg, when are we gonna deploy your latest dance moves to production? #4gileDancer"],
];

export default function Home() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState(messages);

  function addPost() {
    const text = draft.trim();
    if (!text) return;
    setPosts((current) => [["You", text], ...current]);
    setDraft("");
    setComposerOpen(false);
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
          <div className="profile-image grid h-[220px] w-full place-items-center rounded-2xl border border-[#dfe5ee] bg-gradient-to-br from-[#dce9ff] via-[#f2f6ff] to-[#e6e9f2] text-[#3478f6] shadow-inner">
            <div className="grid place-items-center gap-2">
              <span className="grid size-16 place-items-center rounded-full bg-white text-[#3478f6] shadow-sm"><UserRound size={30} strokeWidth={1.7} /></span>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b7b9b]">No photo</span>
            </div>
          </div>
          <section className="sketch-card mt-6 overflow-hidden text-sm leading-[1.4]">
            <div className="border-b border-[#e6eaf0] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Information</div>
            <div className="space-y-6 px-5 py-5">
              <div><p className="m-0 font-bold">Networks</p><p className="m-0">Stanford Alum</p></div>
              <div><p className="m-0 font-bold">Current City</p><p className="m-0">Palo Alto, CA</p></div>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          <p className="mb-2 mt-0 text-sm font-semibold text-[#667085]">Welcome back</p>
          <h1 className="m-0 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Greg Wientjes</h1>
          <div className="mt-3 flex items-center justify-between gap-5">
            <h2 className="hand m-0 text-2xl font-bold leading-none">Your wall</h2>
            <Button className="sm:hidden" onClick={() => setComposerOpen(true)} aria-label="Share a message">
              <Share2 size={17} />
            </Button>
          </div>

          <button
            onClick={() => setComposerOpen(true)}
            className="new-post sketch-border mt-6 flex h-[82px] w-full items-center justify-center text-[#3478f6] transition-colors hover:border-[#3478f6]"
          >
            <span className="hand text-lg font-bold">Write a note...</span>
          </button>

          <div className="mt-4 flex justify-end">
            <Button className="hidden items-center gap-2 sm:flex" onClick={() => setComposerOpen(true)}>
              <Share2 size={18} /> Share
            </Button>
          </div>

          <div className="mt-1">
            {posts.map(([author, text], index) => (
              <article className="wall-line py-3" key={`${author}-${text}-${index}`}>
                <h3 className="hand m-0 text-[24px] font-bold leading-[1.05]">{author}</h3>
                <p className="hand m-0 mt-1 text-[21px] leading-[1.18] sm:text-[22px]">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/20 px-4" onClick={() => setComposerOpen(false)}>
          <div className="sketch-card w-full max-w-lg bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="hand m-0 text-2xl font-bold">Leave a note</h2>
              <button onClick={() => setComposerOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write something kind..."
              className="hand min-h-28 w-full resize-none rounded-xl border border-[#dfe5ee] bg-white/70 p-3 text-xl outline-none focus:ring-2 focus:ring-[#3478f6]"
            />
            <div className="mt-3 flex justify-end">
              <Button className="flex items-center gap-2" onClick={addPost}><Send size={17} /> Post note</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
