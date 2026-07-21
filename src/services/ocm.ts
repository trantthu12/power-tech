// Live Open Charge Map lookup — fetch the N charging stations nearest to a
// coordinate. Used by the map's "near me" mode. Requires VITE_OCM_API_KEY in the
// browser bundle; any failure (no key, CORS, network) is thrown so the caller
// can fall back to the baked PowerTech (Vancouver) stations.
import type { ConnectorType, Site } from "@/types";

function mapConnector(title: string | undefined | null): ConnectorType | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes("chademo")) return "CHAdeMO";
  if (t.includes("ccs") || t.includes("combo")) return "CCS";
  if (
    t.includes("j1772") ||
    t.includes("type 1") ||
    t.includes("type 2") ||
    t.includes("type1") ||
    t.includes("type2") ||
    t.includes("tesla")
  )
    return "J1772";
  return null;
}

interface OcmPoi {
  ID: number;
  NumberOfPoints?: number;
  StatusType?: { IsOperational?: boolean };
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Postcode?: string;
    Latitude?: number;
    Longitude?: number;
  };
  Connections?: { ConnectionType?: { Title?: string } }[];
}

export async function fetchNearestStations(
  lat: number,
  lng: number,
  max = 8
): Promise<Site[]> {
  const key = import.meta.env.VITE_OCM_API_KEY as string | undefined;
  if (!key) throw new Error("VITE_OCM_API_KEY missing");

  const params = new URLSearchParams({
    output: "json",
    latitude: String(lat),
    longitude: String(lng),
    distance: "50",
    distanceunit: "KM",
    maxresults: String(max),
    key,
  });
  const res = await fetch(`https://api.openchargemap.io/v3/poi/?${params}`);
  if (!res.ok) throw new Error(`OCM ${res.status}`);
  const raw = (await res.json()) as OcmPoi[];

  return raw
    .filter(
      (p) =>
        p.AddressInfo &&
        typeof p.AddressInfo.Latitude === "number" &&
        typeof p.AddressInfo.Longitude === "number"
    )
    .map((p) => {
      const a = p.AddressInfo!;
      const connectors = [
        ...new Set(
          (p.Connections || [])
            .map((c) => mapConnector(c.ConnectionType?.Title))
            .filter((c): c is ConnectorType => c !== null)
        ),
      ];
      if (connectors.length === 0) connectors.push("J1772");
      return {
        id: `OCM${p.ID}`,
        name: (a.Title || "Charging Station").trim(),
        lat: a.Latitude!,
        lng: a.Longitude!,
        address: (a.AddressLine1 || a.Title || "").trim(),
        city: (a.Town || a.StateOrProvince || "").trim(),
        zip: (a.Postcode || "—").trim(),
        connectorTypes: connectors,
        numPorts: p.NumberOfPoints || (p.Connections || []).length || 2,
        online: p.StatusType?.IsOperational !== false,
        commissionedDate: "",
      };
    });
}
