import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Champ « prénom » à état local.
 *
 * Auparavant chaque frappe déclenchait un appel serveur, pendant que la
 * synchronisation toutes les 3 s réécrivait la valeur du champ : la saisie
 * sautait et perdait des lettres. Ici on garde la frappe en local, on
 * n'enregistre qu'après une pause (ou à la sortie du champ), et on n'accepte
 * la valeur venue du serveur que lorsque le champ n'a pas le focus et
 * qu'aucun enregistrement n'est en attente.
 */
export function ChampPrenom({
  valeur,
  onEnregistrer,
  placeholder,
  className,
  delai = 600,
}: {
  valeur: string;
  onEnregistrer: (nom: string) => void;
  placeholder?: string;
  className?: string;
  delai?: number;
}) {
  const [local, setLocal] = useState(valeur);
  const [focus, setFocus] = useState(false);
  const enAttente = useRef(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le serveur ne reprend la main que si l'utilisateur n'écrit pas.
  useEffect(() => {
    if (!focus && !enAttente.current) setLocal(valeur);
  }, [valeur, focus]);

  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  function programmer(nom: string) {
    enAttente.current = true;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      enAttente.current = false;
      onEnregistrer(nom);
    }, delai);
  }

  function enregistrerMaintenant() {
    if (minuteur.current) clearTimeout(minuteur.current);
    if (!enAttente.current) return;
    enAttente.current = false;
    onEnregistrer(local);
  }

  return (
    <input
      value={local}
      onChange={(e) => {
        const nom = e.target.value.slice(0, 24);
        setLocal(nom);
        programmer(nom);
      }}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false);
        enregistrerMaintenant();
      }}
      placeholder={placeholder}
      maxLength={24}
      autoComplete="off"
      className={cn(
        "rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary",
        className,
      )}
    />
  );
}
