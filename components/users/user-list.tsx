"use client";

import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserActionsMenu } from "@/components/users/user-actions-menu";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  joinedAt: Date;
  membershipId: string;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
  canManage: boolean;
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

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function UserList({ users, currentUserId, canManage }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No users found in this organization.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {canManage && <TableHead className="w-[50px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          return (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? "user"} />
                    <AvatarFallback>
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user.name ?? "Unknown User"}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email ?? "—"}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "ADMIN" ? "default" : "secondary"}
                >
                  {formatRole(user.role)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(user.joinedAt), "MMM d, yyyy")}
              </TableCell>
              {canManage && (
                <TableCell>
                  <UserActionsMenu
                    user={user}
                    isCurrentUser={isCurrentUser}
                  />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

