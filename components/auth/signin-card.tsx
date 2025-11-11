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
          className="w-full justify-center"
          disabled={isPending}
          onClick={handleSignIn}
        >
          Continue with Google
        </Button>
        <Separator />
        <p className="text-center text-xs text-muted-foreground">
          Access is restricted to internal users with onboarding privileges.
        </p>
      </CardContent>
    </Card>
  );
}

