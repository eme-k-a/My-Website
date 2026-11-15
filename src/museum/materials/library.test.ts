import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AdditiveBlending,
  Color,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MultiplyBlending,
  NormalBlending,
  Texture,
} from 'three';
import { describe, expect, it } from 'vitest';
import { tokens } from '../../design/tokens';
import {
  ACCENT_GLOW,
  createMaterialLibrary,
  createWalnutGrain,
  disposeMaterialLibrary,
  EXHIBIT_MATERIALS,
  floorReflectorParams,
  KIT_MATERIALS,
  type MaterialLibrary,
  type MaterialName,
  type MaterialSpec,
  materialSpecs,
  MaterialsProvider,
  RADIAL_DECAL_SIZE,
  useMaterial,
  useMaterialInstance,
  useMaterialLibrary,
  WALNUT_GRAIN_RANGE,
  WALNUT_GRAIN_SIZE,
  walnutGrainPixels,
} from './index';

const ALL_NAMES: readonly MaterialName[] = [...EXHIBIT_MATERIALS, ...KIT_MATERIALS];
const specs: Record<MaterialName, MaterialSpec> = materialSpecs;

/** Which token each material's base color must equal (EXPERIENCE §7.6). */
const COLOR_FROM: Partial<Record<MaterialName, string>> = {
  brass: tokens.color.brassMetal,
  frostedGlass: tokens.color.frost,
  walnut: tokens.color.walnut,
  ceramic: tokens.color.ceramic,
  ceramicGraphite: tokens.color.graphite,
  paper: tokens.color.paper,
  accentGlow: tokens.color.ink,
  wall: tokens.color.wall,
  floor: tokens.color.floor,
  plinth: tokens.color.plinth,
  beam: tokens.light.ramp[0],
  shadowDecal: tokens.color.ink,
  ceilingSlot: tokens.color.ceilingSlot,
};

const hex = (value: string) => new Color(value).getHex();
const withoutIdentity = (m: Material) => {
  const json = m.toJSON() as unknown as Record<string, unknown>;
  delete json.uuid;
  return json;
};

describe('material specs (EXPERIENCE §7.6)', () => {
  it('has a spec for every frozen name, and no other', () => {
    expect(Object.keys(materialSpecs).sort()).toEqual([...ALL_NAMES].sort());
    expect(EXHIBIT_MATERIALS).toHaveLength(8);
    expect(KIT_MATERIALS).toHaveLength(7);
  });

  it('allows exactly the eight exhibit names', () => {
    const allowed = ALL_NAMES.filter((n) => specs[n].exhibit);
    expect(allowed).toEqual([...EXHIBIT_MATERIALS]);
    expect(allowed).toEqual([
      'brass',
      'frostedGlass',
      'walnut',
      'ceramic',
      'ceramicGraphite',
      'paper',
      'accentGlow',
      'wall',
    ]);
  });

  it('has zero transmission everywhere', () => {
    for (const name of ALL_NAMES) {
      expect(specs[name].transmission ?? 0, name).toBe(0);
    }
    expect(materialSpecs.frostedGlass.transmission).toBe(0);
    expect(materialSpecs.caseGlass.transmission).toBe(0);
  });

  it('takes every color from the tokens', () => {
    for (const name of ALL_NAMES) expect(specs[name].color, name).toBe(COLOR_FROM[name]);
    expect(materialSpecs.accentGlow.emissive).toBe(tokens.color.signal);
  });

  it('accentGlow rests at 0.15 and peaks at 1.4', () => {
    expect(ACCENT_GLOW).toEqual({ rest: 0.15, peak: 1.4 });
    expect(materialSpecs.accentGlow.emissiveIntensity).toBe(ACCENT_GLOW.rest);
  });

  it('gives the high-tier reflector floor its EXPERIENCE parameters', () => {
    expect(floorReflectorParams).toEqual({
      resolution: 512,
      blur: [300, 100],
      mixBlur: 1,
      mixStrength: 1.5,
      roughness: 0.8,
      metalness: 0.5,
      mirror: 0,
      color: tokens.color.floor,
    });
  });
});

describe('createMaterialLibrary', () => {
  it('builds in Node without a canvas when grain is omitted', () => {
    expect(typeof document).toBe('undefined');
    const library: MaterialLibrary = createMaterialLibrary();
    expect(Object.keys(library).sort()).toEqual([...ALL_NAMES].sort());
    expect((library.walnut as MeshStandardMaterial).map).toBeNull();
    disposeMaterialLibrary(createMaterialLibrary());
  });

  it('builds the class, colors and parameters each spec names', () => {
    const library = createMaterialLibrary();
    const classes = {
      MeshStandardMaterial,
      MeshPhysicalMaterial,
      MeshBasicMaterial,
    };
    for (const name of ALL_NAMES) {
      const spec = specs[name] as MaterialSpec & Record<string, unknown>;
      const material = library[name];
      expect(material, name).toBeInstanceOf(classes[spec.type]);
      expect(material.name).toBe(name);
      const expectedColor = COLOR_FROM[name];
      if (expectedColor) {
        expect((material as MeshBasicMaterial).color.getHex(), name).toBe(hex(expectedColor));
      }
      for (const key of ['roughness', 'metalness', 'envMapIntensity', 'opacity', 'depthWrite']) {
        if (spec[key] !== undefined) {
          expect((material as unknown as Record<string, unknown>)[key], `${name}.${key}`).toBe(
            spec[key],
          );
        }
      }
      expect(material.transparent, name).toBe(spec.transparent === true);
      if (material instanceof MeshPhysicalMaterial) expect(material.transmission, name).toBe(0);
    }
    expect(library.accentGlow.emissive.getHex()).toBe(hex(tokens.color.signal));
    expect(library.accentGlow.emissiveIntensity).toBe(0.15);
    expect(library.accentGlow.toneMapped).toBe(true);
    // WP-26: brass keeps a little diffuse and a wider highlight, so it reads as brass at medium.
    expect(library.brass.metalness).toBe(0.9);
    expect(library.brass.roughness).toBe(0.42);
    expect(library.frostedGlass.opacity).toBe(0.55);
    expect(library.caseGlass.opacity).toBe(0.12);
    expect(library.beam.blending).toBe(AdditiveBlending);
    expect(library.shadowDecal.blending).toBe(MultiplyBlending);
    expect(library.shadowDecal.premultipliedAlpha).toBe(true);
    expect(library.walnut.blending).toBe(NormalBlending);
    disposeMaterialLibrary(library);
  });

  it('fills the walnut grain and the 64 px radial decal', () => {
    const grain = new Texture();
    const library = createMaterialLibrary({ grain });
    expect(library.walnut.map).toBe(grain);
    const decal = library.shadowDecal.map!;
    const image = decal.image as { width: number; height: number; data: Uint8Array };
    expect(image.width).toBe(RADIAL_DECAL_SIZE);
    expect(image.height).toBe(64);
    const data = image.data;
    const alpha = (x: number, y: number) => data[(y * 64 + x) * 4 + 3]!;
    expect(alpha(32, 32)).toBeGreaterThan(250);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(63, 32)).toBeLessThan(5);
    // Kit-owned slots start empty.
    expect(library.wall.lightMap).toBeNull();
    expect(library.floor.lightMap).toBeNull();
    expect(library.portrait.map).toBeNull();
    disposeMaterialLibrary(library);
  });

  it('applies an explicit envMap only to the env-mapped materials', () => {
    const envMap = new Texture();
    const library = createMaterialLibrary({ envMap });
    for (const name of ALL_NAMES) {
      const material = library[name] as MeshStandardMaterial;
      expect(material.envMap ?? null, name).toBe(
        specs[name].envMapIntensity === undefined ? null : envMap,
      );
    }
  });

  it('dispose releases every material and the decal, never the caller grain', () => {
    const grain = new Texture();
    const library = createMaterialLibrary({ grain });
    const disposed: string[] = [];
    for (const name of ALL_NAMES) {
      library[name].addEventListener('dispose', () => disposed.push(name));
    }
    let decalDisposed = false;
    let grainDisposed = false;
    library.shadowDecal.map!.addEventListener('dispose', () => (decalDisposed = true));
    grain.addEventListener('dispose', () => (grainDisposed = true));
    disposeMaterialLibrary(library);
    expect(disposed.sort()).toEqual([...ALL_NAMES].sort());
    expect(decalDisposed).toBe(true);
    expect(grainDisposed).toBe(false);
  });

  it('clones keep every parameter, so they share the compiled program', () => {
    const library = createMaterialLibrary({ grain: new Texture() });
    for (const name of EXHIBIT_MATERIALS) {
      const source = library[name];
      const clone = source.clone();
      expect(clone).not.toBe(source);
      expect(clone.type).toBe(source.type);
      expect(withoutIdentity(clone)).toEqual(withoutIdentity(source));
      expect(clone.customProgramCacheKey()).toBe(source.customProgramCacheKey());
    }
    expect(library.walnut.clone().map).toBe(library.walnut.map);
  });
});

describe('walnut grain', () => {
  it('is a seeded 256 px tile within the grain range', () => {
    const a = walnutGrainPixels();
    expect(a).toHaveLength(WALNUT_GRAIN_SIZE * WALNUT_GRAIN_SIZE * 4);
    expect(Buffer.from(walnutGrainPixels()).equals(Buffer.from(a))).toBe(true);
    expect(Buffer.from(walnutGrainPixels(7)).equals(Buffer.from(a))).toBe(false);
    let lo = 255;
    let hi = 0;
    let notGreyOrOpaque = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== a[i + 1] || a[i] !== a[i + 2] || a[i + 3] !== 255) notGreyOrOpaque++;
      lo = Math.min(lo, a[i]!);
      hi = Math.max(hi, a[i]!);
    }
    expect(notGreyOrOpaque).toBe(0);
    expect(lo).toBeGreaterThanOrEqual(Math.floor(WALNUT_GRAIN_RANGE.min * 255));
    expect(hi).toBeLessThanOrEqual(255);
    expect(hi - lo).toBeGreaterThan(30);
  });

  it('needs a browser canvas, and importing it never touches document', () => {
    expect(() => createWalnutGrain()).toThrow('needs a DOM canvas');
  });
});

describe('MaterialsProvider and hooks', () => {
  type Seen = { shared?: Material; instance?: Material; library?: object };

  function render(children: ReactNode) {
    return renderToStaticMarkup(createElement(MaterialsProvider, null, children));
  }

  function Probe({ seen }: { seen: Seen }) {
    const library = useMaterialLibrary();
    const shared = useMaterial('accentGlow');
    const instance = useMaterialInstance('accentGlow');
    Object.assign(seen, { library, shared, instance });
    return null;
  }

  it('gives the shared instance and a program-sharing clone', () => {
    const seen: Seen = {};
    render(createElement(Probe, { seen }));
    expect(seen.shared).toBe((seen.library as MaterialLibrary).accentGlow);
    expect(seen.instance).not.toBe(seen.shared);
    expect(seen.instance).toBeInstanceOf(MeshStandardMaterial);
    expect(withoutIdentity(seen.instance!)).toEqual(withoutIdentity(seen.shared!));
  });

  it('creates one library per provider', () => {
    const first: Seen = {};
    const second: Seen = {};
    render(createElement(Probe, { seen: first }));
    render(createElement(Probe, { seen: second }));
    expect(first.library).not.toBe(second.library);
  });

  it('throws outside a provider', () => {
    function Bare() {
      useMaterial('brass');
      return null;
    }
    expect(() => renderToStaticMarkup(createElement(Bare))).toThrow('MaterialsProvider');
  });
});
