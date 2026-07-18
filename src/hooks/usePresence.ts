"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isPresenceConfigured } from "@/lib/supabase";
import { toRadarBlip, distanceMeters, type Coords } from "@/lib/geo";
import { auraRgb, type AuraId } from "@/lib/aura";
import type { Blip } from "@/components/Radar";

const CHANNEL = "finding-us-lobby";
const RANGE_METERS = 20_000_000; // TEMP: effectively unlimited for testing (~half the globe)
const HEARTBEAT_MS = 3000;
const STALE_MS = 9000;
const ID_KEY = "findingus.id";
const RESOLVED_KEY = "findingus.resolved";

type Peer = { id: string; lat: number; lng: number; aura: AuraId; seen: number };

export type IncomingPing = { n: number; aura: AuraId; from: string };
/** An active mutual connection: matched → confirming → done. */
export type Link = {
  peerId: string;
  aura: AuraId;
  mine: boolean; // I've confirmed the lock
  theirs: boolean; // they've confirmed
  done: boolean; // both confirmed → celebrate then remove
};

export function usePresence(
  on: boolean,
  coords: Coords | null,
  aura: AuraId,
): {
  blips: Blip[] | null;
  peerCount: number;
  status: string;
  ping: (peerId: string) => void;
  incoming: IncomingPing | null;
  link: Link | null;
  confirmLock: () => void;
  declineLock: () => void;
  takenColors: string[];
} {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState("idle");
  const [epoch, setEpoch] = useState(0);
  const [incoming, setIncoming] = useState<IncomingPing | null>(null);
  const [link, setLink] = useState<Link | null>(null);
  // removed peers persist across refreshes (reset only on clear-site-data)
  const [resolvedIds, setResolvedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const v = JSON.parse(localStorage.getItem(RESOLVED_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  // a stable, anonymous per-device id (also survives refresh, resets on wipe)
  const [selfId] = useState(() => {
    if (typeof window === "undefined" || typeof crypto === "undefined") {
      return "anon";
    }
    try {
      let id = localStorage.getItem(ID_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(ID_KEY, id);
      }
      return id;
    } catch {
      return crypto.randomUUID();
    }
  });

  const stateRef = useRef<{ coords: Coords | null; aura: AuraId }>({ coords, aura });
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const announceRef = useRef<() => void>(() => {});
  const iPingedRef = useRef<Set<string>>(new Set());
  const theyPingedRef = useRef<Map<string, AuraId>>(new Map());
  const resolvedRef = useRef<Set<string>>(new Set());
  const linkRef = useRef<Link | null>(null);
  const doneRef = useRef(false);
  const onRef = useRef(on);

  useEffect(() => {
    stateRef.current = { coords, aura };
  }, [coords, aura]);
  useEffect(() => {
    linkRef.current = link;
  }, [link]);
  // keep the resolved-set ref + storage in sync with the resolved ids
  useEffect(() => {
    resolvedRef.current = new Set(resolvedIds);
    try {
      localStorage.setItem(RESOLVED_KEY, JSON.stringify(resolvedIds));
    } catch {
      // ignore storage errors
    }
  }, [resolvedIds]);

  const send = useCallback(
    (event: string, to: string) => {
      const ch = supabase
        ?.getChannels()
        .find((c) => c.topic.endsWith(CHANNEL));
      ch?.send({
        type: "broadcast",
        event,
        payload: { to, from: selfId, fromAura: stateRef.current.aura },
      });
    },
    [selfId],
  );

  // one connection at a time is removed for good once resolved
  const resolve = useCallback((peerId: string) => {
    resolvedRef.current.add(peerId);
    iPingedRef.current.delete(peerId);
    theyPingedRef.current.delete(peerId);
    peersRef.current.delete(peerId);
    setResolvedIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
    setPeers(Array.from(peersRef.current.values()));
    setLink((l) => (l && l.peerId === peerId ? null : l));
    setIncoming((i) => (i && i.from === peerId ? null : i));
  }, []);

  const matchIfMutual = useCallback((peerId: string) => {
    if (resolvedRef.current.has(peerId)) return;
    if (iPingedRef.current.has(peerId) && theyPingedRef.current.has(peerId)) {
      const a = theyPingedRef.current.get(peerId)!;
      setLink((prev) =>
        prev && prev.peerId === peerId
          ? prev
          : { peerId, aura: a, mine: false, theirs: false, done: false },
      );
    }
  }, []);

  // reach out / reach back
  const ping = useCallback(
    (peerId: string) => {
      if (resolvedRef.current.has(peerId)) return;
      iPingedRef.current.add(peerId);
      send("ping", peerId);
      matchIfMutual(peerId);
    },
    [send, matchIfMutual],
  );

  const confirmLock = useCallback(() => {
    const l = linkRef.current;
    if (!l) return;
    send("confirm", l.peerId);
    setLink((prev) => (prev ? { ...prev, mine: true } : prev));
  }, [send]);

  const declineLock = useCallback(() => {
    const l = linkRef.current;
    if (!l) return;
    send("decline", l.peerId);
    resolve(l.peerId);
  }, [send, resolve]);

  // both confirmed → celebrate briefly, then remove each other for good.
  // A ref guard schedules the removal exactly once (no cleanup, so setting
  // done:true can't cancel its own timer).
  useEffect(() => {
    if (!link) {
      doneRef.current = false;
      return;
    }
    if (link.mine && link.theirs && !doneRef.current) {
      doneRef.current = true;
      const pid = link.peerId;
      setLink((l) => (l ? { ...l, done: true } : l));
      setTimeout(() => resolve(pid), 2600);
    }
  }, [link, resolve]);

  // reconnect when returning to the page (even off, to refresh taken colors)
  useEffect(() => {
    const kick = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        setEpoch((e) => e + 1);
      }
    };
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("online", kick);
    window.addEventListener("focus", kick);
    return () => {
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("online", kick);
      window.removeEventListener("focus", kick);
    };
  }, []);

  // subscribe whenever configured — we LISTEN even when off (to learn which
  // colors are taken); we only broadcast ourselves once the light is on.
  useEffect(() => {
    if (!isPresenceConfigured || !supabase) return;
    const client = supabase;
    const channel = client.channel(CHANNEL, {
      config: { broadcast: { self: false } },
    });

    const commit = () => setPeers(Array.from(peersRef.current.values()));
    const announce = () => {
      const { coords: c, aura: a } = stateRef.current;
      if (!c) return;
      channel.send({
        type: "broadcast",
        event: "here",
        payload: { id: selfId, lat: c.lat, lng: c.lng, aura: a },
      });
    };
    announceRef.current = announce;

    channel
      .on("broadcast", { event: "here" }, ({ payload }) => {
        if (!payload || payload.id === selfId) return;
        if (resolvedRef.current.has(payload.id)) return;
        peersRef.current.set(payload.id, {
          id: payload.id,
          lat: payload.lat,
          lng: payload.lng,
          aura: payload.aura,
          seen: Date.now(),
        });
        commit();
      })
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        if (payload?.id && peersRef.current.delete(payload.id)) commit();
      })
      .on("broadcast", { event: "ping" }, ({ payload }) => {
        if (payload?.to !== selfId || resolvedRef.current.has(payload.from)) return;
        theyPingedRef.current.set(payload.from, payload.fromAura);
        setIncoming((prev) => ({
          n: (prev?.n ?? 0) + 1,
          aura: payload.fromAura,
          from: payload.from,
        }));
        matchIfMutual(payload.from);
      })
      .on("broadcast", { event: "confirm" }, ({ payload }) => {
        if (payload?.to !== selfId) return;
        setLink((prev) =>
          prev && prev.peerId === payload.from ? { ...prev, theirs: true } : prev,
        );
      })
      .on("broadcast", { event: "decline" }, ({ payload }) => {
        if (payload?.to === selfId) resolve(payload.from);
      })
      .subscribe((st) => {
        setStatus(st);
        if (st === "SUBSCRIBED" && onRef.current) announce();
      });

    const hb = setInterval(() => {
      if (onRef.current) announce();
      const now = Date.now();
      let changed = false;
      for (const [id, p] of peersRef.current) {
        if (now - p.seen > STALE_MS) {
          peersRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) commit();
    }, HEARTBEAT_MS);

    return () => {
      clearInterval(hb);
      if (onRef.current) {
        channel.send({ type: "broadcast", event: "bye", payload: { id: selfId } });
      }
      announceRef.current = () => {};
      client.removeChannel(channel);
    };
  }, [selfId, epoch, matchIfMutual, resolve]);

  // announce on turning on / say bye on turning off (or coords/aura change)
  useEffect(() => {
    onRef.current = on;
    if (!isPresenceConfigured || !supabase) return;
    if (on && coords) {
      announceRef.current();
    } else if (!on) {
      const ch = supabase.getChannels().find((c) => c.topic.endsWith(CHANNEL));
      ch?.send({ type: "broadcast", event: "bye", payload: { id: selfId } });
    }
  }, [on, coords, aura, selfId]);

  const takenColors = Array.from(new Set(peers.map((p) => p.aura)));

  if (!isPresenceConfigured) {
    return {
      blips: null,
      peerCount: 0,
      status: "demo",
      ping,
      incoming: null,
      link: null,
      confirmLock,
      declineLock,
      takenColors: [],
    };
  }

  const activePeers = on
    ? peers.filter((p) => !resolvedIds.includes(p.id))
    : [];
  const me = coords;
  const blips: Blip[] = me
    ? activePeers.flatMap((p) => {
        const b = toRadarBlip(me, p, RANGE_METERS);
        return b
          ? [{ ...b, color: auraRgb(p.aura), id: p.id, distM: distanceMeters(me, p) }]
          : [];
      })
    : [];

  return {
    blips,
    peerCount: activePeers.length,
    status,
    ping,
    incoming,
    link,
    confirmLock,
    declineLock,
    takenColors,
  };
}
