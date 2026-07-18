"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isPresenceConfigured } from "@/lib/supabase";
import { toRadarBlip, distanceMeters, type Coords } from "@/lib/geo";
import { auraRgb, type AuraId } from "@/lib/aura";
import type { Blip } from "@/components/Radar";

const CHANNEL = "finding-us-lobby";
const RANGE_METERS = 61; // ~200 ft
const HEARTBEAT_MS = 3000;
const STALE_MS = 9000;

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
} {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState("idle");
  const [epoch, setEpoch] = useState(0);
  const [incoming, setIncoming] = useState<IncomingPing | null>(null);
  const [link, setLink] = useState<Link | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [selfId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : "anon",
  );

  const stateRef = useRef<{ coords: Coords | null; aura: AuraId }>({ coords, aura });
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const announceRef = useRef<() => void>(() => {});
  const iPingedRef = useRef<Set<string>>(new Set());
  const theyPingedRef = useRef<Map<string, AuraId>>(new Map());
  const resolvedRef = useRef<Set<string>>(new Set());
  const linkRef = useRef<Link | null>(null);

  useEffect(() => {
    stateRef.current = { coords, aura };
  }, [coords, aura]);
  useEffect(() => {
    linkRef.current = link;
  }, [link]);

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

  // both confirmed → celebrate briefly, then remove each other for good
  useEffect(() => {
    if (!link || !link.mine || !link.theirs || link.done) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLink((l) => (l ? { ...l, done: true } : l));
    const pid = link.peerId;
    const t = setTimeout(() => resolve(pid), 2600);
    return () => clearTimeout(t);
  }, [link, resolve]);

  // reconnect when returning to the page
  useEffect(() => {
    if (!on) return;
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
  }, [on]);

  useEffect(() => {
    if (!isPresenceConfigured || !supabase || !on) return;
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
        if (st === "SUBSCRIBED") announce();
      });

    const hb = setInterval(() => {
      announce();
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
      channel.send({ type: "broadcast", event: "bye", payload: { id: selfId } });
      announceRef.current = () => {};
      client.removeChannel(channel);
    };
  }, [on, selfId, epoch, matchIfMutual, resolve]);

  useEffect(() => {
    if (on && coords) announceRef.current();
  }, [on, coords, aura]);

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
  };
}
