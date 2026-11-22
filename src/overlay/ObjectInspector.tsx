import { useEffect, useRef, useState } from 'react';
import { useMuseum } from '../app/store';
import { content } from '../content';
import {
  useInspection,
  type Inspectable,
  type InspectionPose,
  type InspectionSession,
} from './inspection';
import dialog from './ExhibitDialog.module.css';
import styles from './ObjectInspector.module.css';

const initial: InspectionPose = { yaw: 25, elevation: 24, zoom: 1 };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
export default function ObjectInspector({ id }: { id: Inspectable }) {
  const [medal, setMedal] = useState<number | null>(null);
  const table = id === 'sdsj';
  const label = table
    ? 'Round Table'
    : medal === null
      ? 'Medal Cabinet'
      : content.certifications.items[medal]!.name;
  const start = useInspection((s) => s.starts[id]);
  const lost = useMuseum((s) => s.contextLost);
  const canvas = useRef<HTMLCanvasElement>(null);
  const session = useRef<InspectionSession | null>(null);
  const [pose, setPose] = useState(initial);
  const [failed, setFailed] = useState(false);
  const latest = useRef({ pose, medal });
  const pendingFrame = useRef<number | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const lastDraw = useRef(-Infinity);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    latest.current = { pose, medal };
    if (!session.current || pendingFrame.current !== null) return;
    // A new pointer event updates the pose without postponing an already scheduled draw.
    pendingFrame.current = requestAnimationFrame((now) => {
      pendingFrame.current = null;
      window.clearTimeout(settleTimer.current);
      const moving = now - lastDraw.current < 150;
      lastDraw.current = now;
      if (session.current?.draw(latest.current.pose, latest.current.medal, moving)) {
        settleTimer.current = window.setTimeout(() => {
          session.current?.draw(latest.current.pose, latest.current.medal);
        }, 150);
      }
    });
  }, [pose, medal]);
  useEffect(() => {
    if (!start || lost || !canvas.current) return;
    let active = true;
    start(canvas.current)
      .then((view) => {
        if (!active) {
          view.dispose();
          return;
        }
        session.current = view;
        view.draw(latest.current.pose, latest.current.medal);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      window.clearTimeout(settleTimer.current);
      lastDraw.current = -Infinity;
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = null;
      session.current?.dispose();
      session.current = null;
    };
  }, [start, lost]);
  const rotate = (x: number, y: number) =>
    setPose((p) => ({ ...p, yaw: wrap(p.yaw + x), elevation: clamp(p.elevation + y, -90, 90) }));
  const zoom = (factor: number) =>
    setPose((p) => ({ ...p, zoom: clamp(p.zoom * factor, 0.75, 1.75) }));
  const actions: Record<string, () => void> = {
    ArrowLeft: () => rotate(-15, 0),
    ArrowRight: () => rotate(15, 0),
    ArrowUp: () => rotate(0, 15),
    ArrowDown: () => rotate(0, -15),
    '+': () => zoom(1.15),
    '=': () => zoom(1.15),
    '-': () => zoom(1 / 1.15),
    Home: () => setPose(initial),
  };
  const available = !!start && !lost && !failed;
  return (
    <div className={styles.inspector}>
      {!table && (
        <label>
          Inspect{' '}
          <select
            value={medal ?? 'all'}
            onChange={(e) => {
              setMedal(e.target.value === 'all' ? null : Number(e.target.value));
              setPose(initial);
            }}
          >
            <option value="all">Whole cabinet</option>
            {content.certifications.items.slice(0, 3).map((item, index) => (
              <option key={item.name} value={index}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {available && <p>Drag to rotate, or use the arrow keys. Use + and - to zoom.</p>}
      <canvas
        hidden={!available}
        ref={canvas}
        width={480}
        height={400}
        tabIndex={0}
        role="group"
        aria-label={label + ' rotation and zoom'}
        onKeyDown={(e) => {
          const action = actions[e.key];
          if (action) {
            e.preventDefault();
            e.stopPropagation();
            action();
          }
        }}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (e.pointerType === 'touch') e.currentTarget.dataset.touchRotating = '';
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const last = drag.current;
          if (last?.id !== e.pointerId) return;
          rotate((last.x - e.clientX) * 0.65, (e.clientY - last.y) * 0.65);
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onLostPointerCapture={(e) => {
          if (drag.current?.id !== e.pointerId) return;
          delete e.currentTarget.dataset.touchRotating;
          drag.current = null;
        }}
      />
      {available && (
        <div className={styles.orbitControls}>
          {table ? (
            <button type="button" onClick={() => setPose({ yaw: 0, elevation: 90, zoom: 1 })}>
              Overhead view
            </button>
          ) : (
            medal !== null && (
              <button type="button" onClick={() => setPose({ yaw: 180, elevation: 0, zoom: 1 })}>
                View reverse
              </button>
            )
          )}
          {(
            [
              ['Left', 'ArrowLeft'],
              ['Right', 'ArrowRight'],
              ['Above', 'ArrowUp'],
              ['Below', 'ArrowDown'],
              ['Zoom in', '+'],
              ['Zoom out', '-'],
              ['Reset', 'Home'],
            ] as const
          ).map(([label, key]) => (
            <button type="button" key={key} onClick={actions[key]}>
              {label}
            </button>
          ))}
        </div>
      )}
      <a className={dialog.link} href={`/exhibit/${id}/?mode=classic#story-static-title-views`}>
        {table ? 'View six static angles' : 'View static medal images'}
      </a>
    </div>
  );
}
