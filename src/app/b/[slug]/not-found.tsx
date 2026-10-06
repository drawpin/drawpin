import Link from "next/link";
import { CardPage, INKED_BUTTON } from "./board-look";

export default function BoardNotFound() {
  return (
    <CardPage
      note="No board here"
      title="Board not found"
      intro={<p>Check the link, or scan the board&apos;s code again.</p>}
    >
      {/* A stale link is the likeliest way anyone gets here, and the code on
          the counter is the way out of it. */}
      <Link href="/#join" className={`${INKED_BUTTON} w-full`}>
        Open a board with a code
      </Link>
    </CardPage>
  );
}
