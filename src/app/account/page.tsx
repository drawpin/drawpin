import { redirect } from "next/navigation";

/**
 * The old "Your drawings" page. Your drawings now live on the profile hub
 * (ADR-015); this keeps old links and bookmarks working. The PNG route under
 * `/account/drawings` and `/account/delete` stay where they are.
 */
export default function AccountPage() {
  redirect("/me");
}
