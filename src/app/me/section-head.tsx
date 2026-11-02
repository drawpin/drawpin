import { NOTE } from "../_home/type";

/** A profile section's heading: the handwritten note over the title. */
export function SectionHead({ note, title }: { note: string; title: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className={NOTE}>{note}</p>
      <h2 className="text-2xl leading-tight font-black tracking-tight sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
