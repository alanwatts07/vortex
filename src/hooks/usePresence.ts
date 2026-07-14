"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isPresenceConfigured } from "@/lib/supabase";
import { toRadarBlip, type Coords } from "@/lib/geo";
import { auraRgb, type AuraId } from "@/lib/aura";
import type { Blip } from "@/components/Radar";

const CHANNEL = "vortex-lobby";
const RANGE_METERS = 61; // ~200 ft

type PresenceMeta = { lat: number; lng: number; aura: AuraId };

/**
 * Real-time presence over Supabase. While `on` and located, you broadcast your
 * coordinates + aura color and receive everyone else's, projected onto the radar
 * relative to you. Returns `null` when presence isn't configured (demo mode) so
 * the caller can fall back to simulated orbs.
 */
export function usePresence(
  on: boolean,
  coords: Coords | null,
  aura: AuraId,
): { blips: Blip[] | null; peerCount: number } {
  const [peers, setPeers] = useState<PresenceMeta[]>([]);
  const [selfId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : "anon",
  );
  const trackedRef = useRef(false);
  const stateRef = useRef<{ coords: Coords | null; aura: AuraId }>({
    coords,
    aura,
  });

  // keep the latest coords + aura available to the subscribe callback
  useEffect(() => {
    stateRef.current = { coords, aura };
  }, [coords, aura]);

  // join / leave the channel with the light
  useEffect(() => {
    if (!isPresenceConfigured || !supabase || !on) return;
    const client = supabase;

    const channel = client.channel(CHANNEL, {
      config: { presence: { key: selfId } },
    });

    const sync = () => {
      const state = channel.presenceState<PresenceMeta>();
      const others: PresenceMeta[] = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === selfId) continue;
        const meta = metas[metas.length - 1];
        if (meta && typeof meta.lat === "number") {
          others.push({ lat: meta.lat, lng: meta.lng, aura: meta.aura });
        }
      }
      setPeers(others);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          trackedRef.current = true;
          const { coords: c, aura: a } = stateRef.current;
          if (c) await channel.track({ lat: c.lat, lng: c.lng, aura: a });
        }
      });

    return () => {
      trackedRef.current = false;
      client.removeChannel(channel);
    };
  }, [on, selfId]);

  // push new coordinates / aura as they change
  useEffect(() => {
    if (!isPresenceConfigured || !supabase || !on || !coords) return;
    if (!trackedRef.current) return;
    const channel = supabase
      .getChannels()
      .find((c) => c.topic.endsWith(CHANNEL));
    channel?.track({ lat: coords.lat, lng: coords.lng, aura });
  }, [on, coords, aura]);

  if (!isPresenceConfigured) {
    return { blips: null, peerCount: 0 };
  }

  // mask stale peers when the light is off instead of clearing state in an effect
  const activePeers = on ? peers : [];
  const me = coords;
  const blips: Blip[] = me
    ? activePeers.flatMap((p) => {
        const b = toRadarBlip(me, p, RANGE_METERS);
        return b ? [{ ...b, color: auraRgb(p.aura) }] : [];
      })
    : [];

  return { blips, peerCount: activePeers.length };
}
