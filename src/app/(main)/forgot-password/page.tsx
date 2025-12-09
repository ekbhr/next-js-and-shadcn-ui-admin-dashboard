import type { Metadata } from "next";
import Link from "next/link";

import { Command } from "lucide-react";

export const metadata: Metadata = {
  title: "RevEngine Media - Forgot Password",
};

import { ForgotPasswordForm } from "../auth/_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex h-dvh">
      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Command className="text-primary-foreground mx-auto size-12" />
            <div className="space-y-2">
              <h1 className="text-primary-foreground text-5xl font-light">Reset Password</h1>
              <p className="text-primary-foreground/80 text-xl">Enter your email to receive a reset link</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Forgot Password</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </div>
          </div>
          <div className="space-y-4">
            <ForgotPasswordForm />
            <p className="text-muted-foreground text-center text-xs">
              Remember your password?{" "}
              <Link href="/login" className="text-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

