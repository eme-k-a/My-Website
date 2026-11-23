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
  const cabinet = id === 'certifications';
  const label =
    id === 'finance-tracker'
      ? 'The Balance'
      : id === 'sdsj'
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
  const [debug] = useState(() => new URLSearchParams(window.location.search).has('debug'));
  const [measurement, setMeasurement] = useState('');
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    sample?: { start: number; frames: number };
  } | null>(null);
  useEffect(() => {
    latest.current = { pose, medal };
    if (!session.current || pendingFrame.current !== null) return;
    // A new pointer event updates the pose without postponing an already scheduled draw.
    pendingFrame.current = requestAnimationFrame((now) => {
      pendingFrame.current = null;
      window.clearTimeout(settleTimer.current);
      const moving = now - lastDraw.current < 150;
      lastDraw.current = now;
      const view = session.current;
      if (!view) return;
      const refine = view.draw(latest.current.pose, latest.current.medal, moving);
      if (drag.current?.sample) drag.current.sample.frames++;
      if (refine) {
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
      drag.current = null;
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
      {cabinet && (
        <label>
          Inspect{' '}
          <select
            value={medal ?? 'all'}
            onChange={(e) => {
              setMedal(e.target.value === 'all' ? null : Number(e.target.value));
              setPose(initial);
              setMeasurement('');
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
      {id === 'finance-tracker' && (
        <p>
          Look down on the tray to identify the stacks: round for income, square for expenses, and
          six-sided for budget.
        </p>
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
          if (e.pointerType === 'touch') e.currentTarget.dataset.touchRotating = '';
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            sample: debug ? { start: performance.now(), frames: 0 } : undefined,
          };
        }}
        onPointerMove={(e) => {
          const last = drag.current;
          if (last?.id !== e.pointerId) return;
          rotate((last.x - e.clientX) * 0.65, (e.clientY - last.y) * 0.65);
          last.x = e.clientX;
          last.y = e.clientY;
        }}
        onPointerUp={(e) => {
          const gesture = drag.current;
          if (!gesture?.sample || gesture.id !== e.pointerId) return;
          const seconds = (performance.now() - gesture.sample.start) / 1000;
          const frames = gesture.sample.frames;
          setMeasurement(
            seconds >= 2 && frames > 0
              ? `${(frames / seconds).toFixed(1)} fps · ${frames} frames in ${seconds.toFixed(2)} s`
              : 'Drag continuously for at least 2 seconds.',
          );
        }}
        onLostPointerCapture={(e) => {
          if (drag.current?.id !== e.pointerId) return;
          delete e.currentTarget.dataset.touchRotating;
          drag.current = null;
        }}
      />
      {available && debug && (
        <p>
          Rotation measurement ·{' '}
          <output>{measurement || 'Drag continuously for at least 2 seconds.'}</output>
        </p>
      )}
      {available && (
        <div className={styles.orbitControls}>
          {!cabinet ? (
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
        {cabinet ? 'View static medal images' : 'View six static angles'}
      </a>
    </div>
  );
}
