import React from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  heading: string;
  subheading: string;
}

export function AuthCardLayout({
  children,
  heading,
  subheading,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0D0D0D] px-4 py-12 selection:bg-amber-500 selection:text-black">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link
            href="/"
            className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-black" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              LEADYFY <span className="text-amber-500 text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">OS</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">
            {heading}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-xs">
            {subheading}
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#141414] border border-zinc-800/80 shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          {children}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-zinc-500">
          <p>Protected by Leadyfy Enterprise Security &bull; Agency Operations</p>
        </div>
      </div>
    </div>
  );
}
