"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthCardLayout } from "@/components/auth-card-layout";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError("Verification token is missing or invalid.");
        setLoading(false);
        return;
      }

      try {
        const { error: verifyError } = await authClient.verifyEmail({
          query: { token },
        });

        if (verifyError) {
          setError(verifyError.message || "Failed to verify email. The link may be expired.");
        } else {
          setSuccess(true);
        }
      } catch {
        setError("An unexpected error occurred while verifying your email.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="py-6 text-center space-y-4">
      {loading && (
        <div className="space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-zinc-300">Verifying your email address...</p>
        </div>
      )}

      {!loading && success && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-white">Email Verified!</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Your email has been verified successfully. You can now access all features of your Leadyfy OS workspace.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-white">Verification Failed</h2>
          <p className="text-xs text-red-400 max-w-xs mx-auto">{error}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition-all"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthCardLayout
      heading="Email Verification"
      subheading="Confirming your Leadyfy OS account email"
    >
      <Suspense
        fallback={
          <div className="py-6 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm text-zinc-300">Loading verification session...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthCardLayout>
  );
}
