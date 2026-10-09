/** The red glow: when used, it is the screen's single red element. Smaller and dimmer below 640px. */
export function Glow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-24 -left-20 -z-10 size-[20rem] rounded-full bg-accent opacity-[0.1] blur-[90px] sm:-top-40 sm:-left-24 sm:size-[34rem] sm:opacity-[0.16] sm:blur-[120px]"
    />
  )
}
