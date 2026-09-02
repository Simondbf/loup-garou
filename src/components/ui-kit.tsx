import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CAMP_LABEL, type Camp, type Role } from "@/data/roles";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "btn-base active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "danger" && "btn-danger",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  children,
  variant = "primary",
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "btn-base active:scale-[0.97]",
        variant === "primary" ? "btn-primary" : "btn-ghost",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: string;
}) {
  return (
    <header className="mb-6 animate-rise">
      {back && (
        <Link
          to={back}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← Retour
        </Link>
      )}
      <h1 className="text-3xl leading-tight font-bold text-gradient-moon">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function campClass(camp: Camp) {
  switch (camp) {
    case "loups":
      return "text-wolf border-wolf/40 bg-wolf/10";
    case "villageois":
      return "text-village border-village/40 bg-village/10";
    case "solitaire":
      return "text-solo border-solo/40 bg-solo/10";
    default:
      return "text-primary border-primary/40 bg-primary/10";
  }
}

export function CampBadge({ camp, className }: { camp: Camp; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        campClass(camp),
        className,
      )}
    >
      {CAMP_LABEL[camp]}
    </span>
  );
}

export function RoleSigil({ role, size = "md" }: { role: Role; size?: "sm" | "md" | "lg" }) {
  const src = roleImage(role.id);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border",
        campClass(role.camp),
        size === "sm" && "h-10 w-10 text-xl",
        size === "md" && "h-14 w-14 text-3xl",
        size === "lg" && "h-28 w-28 text-6xl",
      )}
      aria-hidden
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          width={768}
          height={1024}
          className="h-full w-full object-cover"
        />
      ) : (
        role.emoji
      )}
    </div>
  );
}

/** Illustration plein cadre d'une carte (écran de révélation). */
export function RoleArt({ role, className }: { role: Role; className?: string }) {
  const src = roleImage(role.id);
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border",
        campClass(role.camp),
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`Illustration du rôle ${role.name}`}
          width={768}
          height={1024}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl">
          {role.emoji}
        </div>
      )}
    </div>
  );
}


export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface max-h-[85vh] w-full max-w-md overflow-y-auto p-5 animate-rise"
      >
        {children}
      </div>
    </div>
  );
}

export function RoleDetail({ role, onClose }: { role: Role; onClose?: () => void }) {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <RoleSigil role={role} size="lg" />
      </div>
      <h2 className="mt-4 text-2xl font-bold">{role.name}</h2>
      <div className="mt-2 flex justify-center">
        <CampBadge camp={role.camp} />
      </div>
      <p className="mt-4 text-left text-sm leading-relaxed text-muted-foreground">
        {role.description}
      </p>
      {onClose && (
        <Button className="mt-5 w-full" onClick={onClose}>
          Fermer
        </Button>
      )}
    </div>
  );
}
