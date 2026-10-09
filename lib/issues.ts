export type Issue = {
  id: string;
  user_id: string;
  image_url: string;
  lat: number;
  lng: number;
  description: string | null;
  status: string;
  created_at: string;
};

export const CATEGORIES = [
  { id: "pothole", label: "Pothole", hint: "Broken or sunken pavement" },
  { id: "lighting", label: "Streetlight", hint: "Dark, flickering, or damaged" },
  { id: "waste", label: "Trash", hint: "Dumping, overflow, or litter" },
  { id: "graffiti", label: "Graffiti", hint: "Paint, tags, or stickers" },
  { id: "sidewalk", label: "Sidewalk", hint: "Cracks, heaves, or blockages" },
  { id: "signal", label: "Signal", hint: "Signs or traffic lights" },
  { id: "other", label: "Other", hint: "Anything else on the street" },
] as const;

export const STATUSES = ["Pending", "In Progress", "Resolved"] as const;

export type DeskFilter = "All" | (typeof STATUSES)[number] | "Other";

const STATUS_SET = new Set<string>(STATUSES);
const CATEGORY_PREFIX = new RegExp(
  `^\\[(${CATEGORIES.map((category) => category.label).join("|")})\\]\\s*`,
);

export const SAMPLE_ISSUES: Issue[] = [
  {
    id: "sample-pothole",
    user_id: "sample",
    image_url: "",
    lat: 37.77493,
    lng: -122.41942,
    description: "[Pothole] Sunken patch in the eastbound lane beside the bus stop.",
    status: "Pending",
    created_at: "2026-04-12T16:20:00.000Z",
  },
  {
    id: "sample-light",
    user_id: "sample",
    image_url: "",
    lat: 37.76921,
    lng: -122.43112,
    description: "[Streetlight] The lamp at the corner has been dark for three nights.",
    status: "In Progress",
    created_at: "2026-04-09T02:10:00.000Z",
  },
  {
    id: "sample-trash",
    user_id: "sample",
    image_url: "",
    lat: 37.78105,
    lng: -122.4118,
    description: "[Trash] Mattress and bags dumped across the sidewalk.",
    status: "Resolved",
    created_at: "2026-03-28T18:45:00.000Z",
  },
];

export function composeDescription(category: string, text: string) {
  return `[${category}] ${text.trim()}`;
}

export function splitDescription(description: string | null | undefined) {
  const value = description?.trim() ?? "";
  const match = CATEGORY_PREFIX.exec(value);
  if (!match) {
    return {
      category: value ? "General" : "Unspecified",
      text: value || "No description provided.",
    };
  }

  return {
    category: match[1],
    text: value.slice(match[0].length).trim() || "No description provided.",
  };
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "Date unavailable";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function statusTone(status: string) {
  if (status === "Pending") return "pending";
  if (status === "In Progress") return "progress";
  if (status === "Resolved") return "resolved";
  return "custom";
}

export function summarize(issues: Issue[]) {
  const summary = { total: issues.length, pending: 0, progress: 0, resolved: 0, other: 0 };
  for (const issue of issues) {
    if (issue.status === "Pending") summary.pending += 1;
    else if (issue.status === "In Progress") summary.progress += 1;
    else if (issue.status === "Resolved") summary.resolved += 1;
    else summary.other += 1;
  }
  return summary;
}

export function issueMatches(issue: Issue, query: string, filter: DeskFilter) {
  if (filter === "Other" && STATUS_SET.has(issue.status)) return false;
  if (filter !== "All" && filter !== "Other" && issue.status !== filter) return false;

  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const { category, text } = splitDescription(issue.description);
  return `${category} ${text} ${issue.status} ${formatCoords(issue.lat, issue.lng)}`
    .toLowerCase()
    .includes(needle);
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function asIssues(data: unknown): Issue[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const lat = asNumber(record.lat);
    const lng = asNumber(record.lng);
    if (typeof record.id !== "string" || lat === null || lng === null) return [];

    return [
      {
        id: record.id,
        user_id: typeof record.user_id === "string" ? record.user_id : "",
        image_url: typeof record.image_url === "string" ? record.image_url : "",
        lat,
        lng,
        description: typeof record.description === "string" ? record.description : null,
        status: typeof record.status === "string" && record.status.trim() ? record.status : "Pending",
        created_at: typeof record.created_at === "string" ? record.created_at : "",
      },
    ];
  });
}
