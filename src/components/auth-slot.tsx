import { Link } from "@tanstack/react-router";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { initials } from "@/lib/utils";

export function AuthSlot({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-elevated" />
    );
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        {compact ? "Sign in" : "Open console"}
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex min-w-0 items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-elevated text-xs font-medium">
          {initials(label)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{label}</p>
        {authEnabled && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-[11px] text-subtle hover:text-foreground"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
