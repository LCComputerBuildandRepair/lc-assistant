import Link from "next/link";
import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/session";
import { business } from "@/lib/business";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
  { href: "/appointments", label: "Appointments" },
  { href: "/quotes", label: "Quotes" },
  { href: "/inbox", label: "Inbox" },
  { href: "/messages", label: "Messages" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isLoggedIn())) redirect("/login");

  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 sm:flex">
        <div className="px-2">
          <div className="text-sm font-semibold leading-tight">{business.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">Owner dashboard</div>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="mt-auto px-1">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <span className="text-sm font-semibold">{business.name}</span>
          <nav className="flex gap-3 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="text-slate-600">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
