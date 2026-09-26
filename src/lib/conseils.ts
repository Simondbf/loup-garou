import { useEffect, useState } from "react";

/**
 * Conseils du Maître du Jeu.
 *
 * Un MJ qui connaît le jeu n'a pas besoin qu'on lui rappelle à chaque écran
 * ce que fait la Sorcière : les rappels de règle encombrent alors le
 * déroulé au lieu de l'aider. Ils sont donc éteints par défaut et
 * s'allument depuis le menu, pour la première partie ou pour un MJ qui
 * débute.
 *
 * La description du rôle affiché reste toujours accessible, mais à la
 * demande : c'est le bouton « ? Aide » en bas de l'écran de conduite.
 *
 * Le réglage vit sur l'appareil, comme le thème : il n'a rien à faire sur
 * le serveur.
 */

const CLE = "lg-conseils";

export function lireConseils(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(CLE) === "oui";
}

export function useConseils() {
  const [conseils, setConseilsState] = useState(false);

  useEffect(() => {
    setConseilsState(lireConseils());
  }, []);

  function setConseils(valeur: boolean) {
    setConseilsState(valeur);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CLE, valeur ? "oui" : "non");
    }
  }

  return { conseils, setConseils };
}
