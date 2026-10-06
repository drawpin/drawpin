import Image from "next/image";

/** The logo's height on the poster; each half keeps its own width. */
export const LOGO_HEIGHT = "h-[clamp(4.5rem,15vw,9rem)] w-auto";

/**
 * One half of the wordmark, cut from the transparent logo at the gap
 * between the w and the p: "draw", or "pin" with its pen for the i.
 */
export function Half({
  word,
  className = "",
  style,
}: {
  word: "draw" | "pin";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Image
      src={`/logo-${word}.webp`}
      alt=""
      width={word === "draw" ? 578 : 348}
      height={304}
      unoptimized
      loading="eager"
      draggable={false}
      className={`${LOGO_HEIGHT} ${className}`}
      style={style}
    />
  );
}
