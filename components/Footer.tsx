// UTM params let colinfran.com attribute visitors that arrive from this page.
const AUTHOR_URL = "https://colinfran.com/?utm_source=sf-police-scanner&utm_medium=footer&utm_campaign=made-by";

export default function Footer() {
  return (
    <a
      href={AUTHOR_URL}
      target="_blank"
      rel="noopener"
      className="group fixed bottom-3 right-3 z-[1000] flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400 shadow-lg shadow-black/40 backdrop-blur transition-colors hover:border-red-500/50 hover:text-zinc-200"
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500/70" />
      </span>
      <span>
        {"Made in SF by "}
        <span className="font-medium text-zinc-300 group-hover:text-red-400">Colin Franceschini</span>
      </span>
    </a>
  );
}
