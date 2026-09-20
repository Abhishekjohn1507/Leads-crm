import Link from "next/link";
import { Zap, ArrowRight, ShieldCheck, Lock, Users, User as UserIcon, LayoutDashboard } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";

export default async function Home() {
  const session = await getSession();
  const user = session ? await getCurrentUserWithRole() : null;
  const displayName = user?.name || session?.user?.name || "User";
  const userRole = user?.role;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              LEADYFY <span className="text-amber-500 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">OS</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-2.5">
                {/* User Pill with Avatar Icon & Name */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-amber-500/50 hover:bg-zinc-800/80 transition-all text-left shadow-sm"
                  title="View Dashboard"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                    <UserIcon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-100 max-w-[130px] sm:max-w-[180px] truncate leading-tight">
                      {displayName}
                    </span>
                    {userRole && (
                      <span className="text-[10px] text-amber-400 font-mono tracking-wider font-semibold">
                        {userRole}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Direct Dashboard Link */}
                <Link
                  href="/dashboard"
                  className="text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 relative">
        <div className="absolute w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Agency Management & Operations OS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            The Operating System for <br />
            <span className="text-amber-500">UGC & Digital Agencies</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Centralize your client pipelines, creator workflows, video delivery, and operations inside one unified platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{session ? "Enter Agency Workspace" : "Access Workspace"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {!session && (
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In to Account</span>
              </Link>
            )}
          </div>

          {/* Quick Feature Pillars */}
          <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <Lock className="w-5 h-5 text-amber-500 mb-2" />
              <div className="text-xs font-semibold text-white">Enterprise Auth</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Encrypted cookie sessions, password hashing, and zero token leakage.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <ShieldCheck className="w-5 h-5 text-amber-500 mb-2" />
              <div className="text-xs font-semibold text-white">Protected Boundary</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Edge middleware route guards across agency resources.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <Users className="w-5 h-5 text-amber-500 mb-2" />
              <div className="text-xs font-semibold text-white">Postgres / Neon</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Scalable database adapter ready for production multi-tenancy.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} Leadyfy OS. Internal Agency Management & Operations SaaS.
      </footer>
    </div>
  );
}
