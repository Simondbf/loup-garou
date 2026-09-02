// Illustrations originales générées pour chaque rôle (une par carte).
const modules = import.meta.glob("../assets/roles/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const ROLE_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [
    path.split("/").pop()!.replace(/\.jpg$/, ""),
    url,
  ]),
);

export function roleImage(roleId: string): string | undefined {
  return ROLE_IMAGES[roleId];
}
