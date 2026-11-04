import Link from "next/link";

const SCREENS: [string, string][] = [
  ["Sidebar A (picked): white inked card", "/prototype/profiles/board?v=a"],
  ["Sidebar B: blue poster", "/prototype/profiles/board?v=b"],
  ["Sidebar C: drawing rail + bottom sheet", "/prototype/profiles/board?v=c"],
  ["Sidebar, signed out", "/prototype/profiles/board?who=out"],
  ["Sidebar, signed in (member)", "/prototype/profiles/board?who=in"],
  ["Sidebar, board row menu", "/prototype/profiles/board?menu=friends-board"],
  ["Sidebar, empty", "/prototype/profiles/board?who=in&empty=1"],
  ["Draw page", "/prototype/profiles/draw"],
  ["Landing 1: home hub", "/prototype/profiles/hub"],
  ["Landing 1: home hub, all caught up", "/prototype/profiles/hub?quiet=1"],
  ["Landing 2: marketing + sidebar", "/prototype/profiles/home"],
  ["Profile hub", "/prototype/profiles/me"],
  ["Profile hub, changing your name", "/prototype/profiles/me?edit=1"],
  ["Boards you run (2 of 5)", "/prototype/profiles/admin"],
  ["Boards you run, at the cap", "/prototype/profiles/admin?cap=1"],
  ["Board admin with switcher", "/prototype/profiles/admin/board?switch=1"],
  ["Sign-in sheet", "/prototype/profiles/sign-in"],
  ["Sign-in sheet, code step", "/prototype/profiles/sign-in?step=code"],
  ["Home: menu button and logo placement", "/prototype/topbar"],
];

/**
 * TEMPORARY: the index of the profiles prototypes. Add `&open=1` to a URL to
 * open the phone drawer. Deleted before feat/profiles merges to main.
 */
export default function PrototypeIndex() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 py-10">
      <p className="bg-attention w-fit rounded-md px-2 py-0.5 text-sm font-bold">
        Temporary prototype: deleted before merge
      </p>
      <h1 className="text-3xl font-black tracking-tight">
        Profiles prototypes
      </h1>
      <ul className="flex flex-col gap-1">
        {SCREENS.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
