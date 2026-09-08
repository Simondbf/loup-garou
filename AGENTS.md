<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## React : les Effects en dernier recours

Un `useEffect` ne sert qu'à **synchroniser avec un système extérieur à React** :
une minuterie, un abonnement, le `localStorage`, une écoute d'événement du
navigateur, une requête réseau récurrente. Rien d'autre.

Avant d'en écrire un, chercher lequel de ces quatre cas s'applique :

1. **Une valeur qui découle d'autres valeurs se calcule pendant le rendu.**
   Pas d'état miroir, pas d'effet qui recopie une prop dans un `useState`.
   `const prenom = saisie ?? place?.name ?? ""` plutôt qu'un état `prenom`
   remis à jour par un effet à chaque changement de place.
2. **Ce qui découle d'une action se fait dans le gestionnaire d'événement.**
   La composition conseillée se pose au clic qui ouvre l'écran des cartes,
   pas dans un effet qui surveille l'effectif.
3. **Réinitialiser un état à un changement de contexte se fait avec `key`**,
   en laissant React remonter le composant.
4. **Un calcul coûteux et pur se met dans `useMemo`.** C'est le cas des
   fonctions `construire()` des moteurs de nuit et de jour.

Un effet vide, ou un effet dont le corps ne touche qu'à du `setState`, est
presque toujours le signe qu'on est passé à côté de l'un de ces quatre cas.

### Les effets légitimes du projet

- `game-store.tsx` : lecture du `localStorage` à l'hydratation, et le
  rafraîchissement périodique de la partie (intervalle + écoute du `focus`).
- `champ-prenom.tsx` : nettoyage du minuteur de saisie différée.
- `theme.ts`, `conseils.ts`, `use-mobile.tsx` : réglages lus sur l'appareil.
- Les redirections `if (hydrated && !session) navigate(...)` : la session vit
  dans le `localStorage`, donc elle n'est connue qu'après l'hydratation. Le
  routeur est ici le système extérieur. À déplacer dans un `beforeLoad` de
  TanStack Router si l'occasion se présente.

Les fichiers de `src/components/ui/` viennent de shadcn et ne sont pas
concernés.

## Autres conventions

- Français partout : noms de variables, commentaires, messages d'erreur.
- Les commentaires expliquent **pourquoi**, jamais ce que le code fait déjà.
- `npx tsc --noEmit`, `npx prettier --check src` et `npm run build` doivent
  passer avant tout commit.
