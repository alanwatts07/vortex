"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isPresenceConfigured } from "@/lib/supabase";
import { toRadarBlip, distanceMeters, type Coords } from "@/lib/geo";
import { auraRgb, type AuraId } from "@/lib/aura";
import type { Blip } from "@/components/Radar";

const CHANNEL = "finding-us-lobby";
const RANGE_METERS = 61; // ~200 ft
const HEARTBEAT_MS = 3000; // re-announce yourself this often
const STALE_MS = 9000; // drop a peer we haven't heard from in this long

type Peer = { id: string; lat: number; lng: number; aura: AuraId; seen: number };

export type IncomingPing = { n: number; aura: AuraId; from: string };

/**
 * Real-time presence over Supabase *broadcast* (not presence.track, which
 * accumulates metas and drops rapid updates). Each device announces
 * {id, coords, aura} on change + on a heartbeat; peers are pruned when they go
 * quiet. Also carries lightweight pings. `blips` is null in demo mode.
 */
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
} {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState("idle");
  const [epoch, setEpoch] = useState(0);
  const [incoming, setIncoming] = useState<IncomingPing | null>(null);
  const [selfId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : "anon",
  );

  const stateRef = useRef<{ coords: Coords | null; aura: AuraId }>({ coords, aura });
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const announceRef = useRef<() => void>(() => {});

  useEffect(() => {
    stateRef.current = { coords, aura };
  }, [coords, aura]);

  // phones freeze the tab + drop the socket when backgrounded/locked; force a
  // fresh re-subscribe whenever we come back to the page or the network returns
  useEffect(() => {
    if (!on) return;
    const kick = () => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      ) {
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

  // join the channel; broadcast presence + prune stale peers
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
        if (payload?.to === selfId) {
          setIncoming((prev) => ({
            n: (prev?.n ?? 0) + 1,
            aura: payload.fromAura,
            from: payload.from,
          }));
        }
      })
      .subscribe((st) => {
        setStatus(st);
        if (st === "SUBSCRIBED") announce();
      });

    // heartbeat: re-announce + drop peers we haven't heard from
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
  }, [on, selfId, epoch]);

  // announce immediately when your coords or aura change
  useEffect(() => {
    if (on && coords) announceRef.current();
  }, [on, coords, aura]);

  const ping = useCallback(
    (peerId: string) => {
      const channel = supabase
        ?.getChannels()
        .find((c) => c.topic.endsWith(CHANNEL));
      channel?.send({
        type: "broadcast",
        event: "ping",
        payload: { to: peerId, from: selfId, fromAura: stateRef.current.aura },
      });
    },
    [selfId],
  );

  if (!isPresenceConfigured) {
    return { blips: null, peerCount: 0, status: "demo", ping, incoming: null };
  }

  const activePeers = on ? peers : [];
  const me = coords;
  const blips: Blip[] = me
    ? activePeers.flatMap((p) => {
        const b = toRadarBlip(me, p, RANGE_METERS);
        return b
          ? [
              {
                ...b,
                color: auraRgb(p.aura),
                id: p.id,
                distM: distanceMeters(me, p),
              },
            ]
          : [];
      })
    : [];

  return { blips, peerCount: activePeers.length, status, ping, incoming };
}
