"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export function SignInCard() {
  const [isPending, startTransition] = useTransition();

  const handleSignIn = () => {
    startTransition(() => {
      void signIn("google", { callbackUrl: "/" });
    });
  };

  return (
    <Card className="mx-auto w-full max-w-sm border-border/70 shadow-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-lg font-semibold text-foreground">
          Sign in to Supplier Hub
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Use your Google workspace account for secure access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          size="lg"
          className="w-full justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          disabled={isPending}
          onClick={handleSignIn}
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Redirecting to Google...</span>
            </>
          ) : (
            "Continue with Google"
          )}
        </Button>
        {isPending && (
          <p className="text-center text-xs text-muted-foreground animate-pulse" role="status" aria-live="polite">
            Redirecting to Google sign-in...
          </p>
        )}
        <Separator />
        <p className="text-center text-xs text-muted-foreground">
          Access is restricted to internal users with onboarding privileges.
        </p>
      </CardContent>
    </Card>
  );
}

