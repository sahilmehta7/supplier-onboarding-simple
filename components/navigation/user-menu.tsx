"use client";

import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const initials = getInitials(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2 text-left text-sm font-medium"
        >
          <Avatar className="size-8 border border-border/70">
            <AvatarImage src={image ?? undefined} alt={name ?? "user avatar"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden min-w-[140px] flex-col leading-tight md:flex">
            <span className="truncate">{name ?? "Signed in"}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email ?? "—"}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 rounded-lg border border-border/80 p-1.5 text-sm"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {name ?? "Signed in"}
          </span>
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void signOut({ callbackUrl: "/signin" });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const [first, second] = name.split(" ");
    if (first && second) {
      return `${first[0]}${second[0]}`.toUpperCase();
    }
    return first?.slice(0, 2).toUpperCase() ?? "U";
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "U";
}

