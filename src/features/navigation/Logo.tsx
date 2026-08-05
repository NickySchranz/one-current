/** The One Current mark: a main line, one branch, and its return into Now. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="app-logo"
      width={size * 1.5}
      height={size}
      viewBox="0 0 33 22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 15 H31"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7 15 C10 15, 9 7, 13 7 H18 C22 7, 21 15, 24 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <circle cx="29" cy="15" r="3.2" fill="var(--accent)" />
    </svg>
  );
}
