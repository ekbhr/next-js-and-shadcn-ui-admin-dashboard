"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { siGoogle } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Google sign-in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className={cn(className)} 
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      type="button"
      {...props}
    >
      <SimpleIcon icon={siGoogle} className="size-4" />
      {isLoading ? "Connecting..." : "Continue with Google"}
    </Button>
  );
}
