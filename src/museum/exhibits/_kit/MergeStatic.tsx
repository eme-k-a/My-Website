// <MergeStatic> (F-M3a): wraps an exhibit's static parts and merges the meshes that share a
// library material into one draw call each (./mergeStatic). Only parts that never move, appear or
// change shape go inside; a part with its own material instance (a glow that animates) stays its
// own draw call because it shares that material with nothing. The merge runs in a passive effect,
// after every layout effect of the commit (instance matrices included) and before the kit
// compiles and reveals the exhibit, so the visitor never sees the unmerged state.
import { useEffect, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { mergeStatic, unmergeStatic } from './mergeStatic';

export function MergeStatic({ name, children }: { name?: string; children: ReactNode }) {
  const root = useRef<Group>(null);
  // No dependency list: a re-render may replace children, so each commit merges afresh.
  useEffect(() => {
    const group = root.current;
    if (!group) return;
    const result = mergeStatic(group);
    return () => unmergeStatic(result);
  });
  return (
    <group ref={root} name={name ?? 'merge-static'}>
      {children}
    </group>
  );
}
