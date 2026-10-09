/** Monochrome mark: a faceted obsidian shard. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-[15px] font-medium tracking-[-0.01em]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2.5 19.5 8 16.8 21H7.2L4.5 8Z" />
        <path d="M12 2.5V21M4.5 8 12 12l7.5-4" strokeOpacity=".45" />
      </svg>
      Obsidian Bank
    </span>
  )
}
