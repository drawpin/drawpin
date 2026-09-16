import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "@/lib/tile-image";

// Control characters would let a name or caption break the board's layout
// or smuggle invisible text; captions and names are single-line.
const NO_CONTROL_CHARS = /^[^\p{Cc}]*$/u;

/** Trims a text field and treats an empty value as "not provided". */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { message: `Keep your ${label} under ${max + 1} characters.` })
    .regex(NO_CONTROL_CHARS, {
      message: `Your ${label} has invalid characters.`,
    })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);

export const postTileFormSchema = z.object({
  slug: z.string().min(1),
  displayName: optionalText(40, "name"),
  caption: optionalText(80, "caption"),
  image: z
    .instanceof(Blob, { message: "Draw something first." })
    .refine((file) => file.size > 0, { message: "Draw something first." })
    .refine((file) => file.size <= MAX_UPLOAD_BYTES, {
      message: "Your drawing is too large to upload.",
    }),
});

export type PostTileState =
  { status: "idle" } | { status: "error"; message: string };
