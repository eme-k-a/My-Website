# __ID__: "__TITLE__"

Scaffolded by `npm run new:exhibit -- __ID__` (WP-35). Until a builder fills it, this folder shows the placeholder crate (EXPERIENCE §5.7) at the stop. Runbook: `docs/CONTENT_UPDATE.md`. Concept checklist and R2 verdict: [`review/concepts/__ID__.md`](../../../../review/concepts/__ID__.md) (R2 writes it with the builder brief).

## Concept

[placeholder: one sculptural object for this entry, agreed with Emeka and R2 before the builder brief. No logos, no text meshes, no lights.]

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675]. The object must fit these bounds (`stats().exhibits.__ID__.inBounds` under `?test=1`). Only MUN (the wide plinth) and the certifications wall vitrine have other slot variants.

## Budget

`index.ts` starts at the placeholder crate's budget: 300 triangles, 2 draw calls, 0 MB textures, `motion: 'none'`. The builder sets it to the measured object: at most 20,000 triangles (`MAX_EXHIBIT_TRIANGLES`), and a lazy chunk of at most 40 KB gzip (`perf/budgets.json`, `npm run check:budgets`).

Draw calls: put every static part inside the kit's `<MergeStatic>` (ARCHITECTURE §7.5), so meshes that share a library material merge into one draw call each. Moving parts and parts with their own material instance stay outside it.

## Materials

The shared material library only (`props.materials`, `useMaterial`, `useMaterialInstance` from `../_kit`). No new materials and no lights; ask R2 for a library shader when the object needs one.

## Motion

At most one slow motion, driven only by `useExhibitClock()` from `../_kit`, with a still pose for reduced motion, `?test=1` and tier low.

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, motion).
- `__COMPONENT__.tsx`: the lazy component (default export, `ExhibitProps`). Today it renders the kit's placeholder crate.
