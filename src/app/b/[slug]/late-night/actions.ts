"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getBoard } from "../data";
import {
  acceptBoard,
  LATE_NIGHT_COOKIE,
  LATE_NIGHT_COOKIE_MAX_AGE,
} from "./consent";
import { GATED_PAGES } from "./pages";

const continueSchema = z.object({
  slug: z.string().min(1).max(200),
  page: z.enum(GATED_PAGES),
});

/**
 * Continues past the Late Night warning: remembers on this device that the
 * visitor chose to see this board, then takes them to the page they asked for.
 */
export async function continueToBoard(formData: FormData): Promise<void> {
  const parsed = continueSchema.safeParse({
    slug: formData.get("slug"),
    page: formData.get("page"),
  });
  if (!parsed.success) notFound();

  const board = await getBoard(parsed.data.slug);
  if (!board) notFound();

  const cookieStore = await cookies();
  cookieStore.set(
    LATE_NIGHT_COOKIE,
    acceptBoard(cookieStore.get(LATE_NIGHT_COOKIE)?.value, board.id),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: LATE_NIGHT_COOKIE_MAX_AGE,
    },
  );

  redirect(`/b/${board.slug}${parsed.data.page}`);
}
