// Disposal when an exhibit unmounts beyond distance 4 (ARCHITECTURE §7.4): its geometries, the
// materials it made (useMaterialInstance clones, anything else that is not a library material)
// and their textures (canvasTexture). Library materials and the textures they hold are shared by
// the whole canvas and are never disposed here.
import type { BufferGeometry, Material, Object3D, Texture } from 'three';

export interface ExhibitResources {
  geometries: Set<BufferGeometry>;
  materials: Set<Material>;
  textures: Set<Texture>;
}

const isTexture = (value: unknown): value is Texture =>
  typeof value === 'object' && value !== null && (value as Texture).isTexture === true;

/** Every texture a material references directly or through its uniforms. */
export function texturesOf(material: Material): Texture[] {
  const found: Texture[] = [];
  for (const value of Object.values(material)) if (isTexture(value)) found.push(value);
  const uniforms = (material as { uniforms?: Record<string, { value?: unknown } | undefined> })
    .uniforms;
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      if (isTexture(uniform?.value)) found.push(uniform.value);
    }
  }
  return found;
}

/** The shared objects to keep: the library materials and every texture they use. */
export function sharedResources(library: Readonly<Record<string, Material>>): Set<object> {
  const keep = new Set<object>();
  for (const material of Object.values(library)) {
    keep.add(material);
    for (const texture of texturesOf(material)) keep.add(texture);
  }
  return keep;
}

/** Collects what `root`'s sub-tree owns, skipping anything in `keep`. Adds to `into` if given. */
export function collectResources(
  root: Object3D,
  keep: ReadonlySet<object>,
  into: ExhibitResources = { geometries: new Set(), materials: new Set(), textures: new Set() },
): ExhibitResources {
  root.traverse((object) => {
    const drawable = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (drawable.geometry && !keep.has(drawable.geometry)) into.geometries.add(drawable.geometry);
    const materials = Array.isArray(drawable.material)
      ? drawable.material
      : drawable.material
        ? [drawable.material]
        : [];
    for (const material of materials) {
      if (keep.has(material)) continue;
      into.materials.add(material);
      for (const texture of texturesOf(material)) {
        if (!keep.has(texture)) into.textures.add(texture);
      }
    }
  });
  return into;
}

export function disposeResources(resources: ExhibitResources): void {
  resources.geometries.forEach((g) => g.dispose());
  resources.materials.forEach((m) => m.dispose());
  resources.textures.forEach((t) => t.dispose());
}
