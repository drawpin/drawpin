import Image from "next/image";

/** The gold trophy, on a drawing's corner. */
export function TrophyBadge({ size }: { size: number }) {
  return (
    <Image
      src="/trophies/gold.webp"
      alt=""
      width={size}
      height={size}
      unoptimized
      className="absolute -right-3 -bottom-3 rotate-6 drop-shadow-[2px_2px_0_rgb(15_27_45/0.25)]"
    />
  );
}
