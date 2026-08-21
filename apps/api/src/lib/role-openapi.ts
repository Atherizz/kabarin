export type RoleGroupKey = "cadre" | "volunteer" | "family" | "public" | "all";

export interface RoleGroupConfig {
  key: RoleGroupKey;
  title: string;
  description: string;
  default?: boolean;
  tagFilter: (tag: string) => boolean;
}

export const ROLE_GROUPS: RoleGroupConfig[] = [
  {
    key: "cadre",
    title: "Cadre (Kader RT)",
    description: "Endpoints accessible to RT Cadres for managing territory, elderly welfare, volunteers, medications, and escalation chains.",
    default: true,
    tagFilter: (tag) =>
      [
        "Auth & Session",
        "Community & Territory",
        "Elderly Management",
        "Elderly Verification & Escalations",
        "Volunteer Management",
        "Medication Schedules",
        "Family Contacts",
        "Field Visits",
      ].includes(tag),
  },
  {
    key: "volunteer",
    title: "Volunteer (Relawan)",
    description: "Endpoints accessible to Caregiving Volunteers for viewing assigned elderly and logging visits.",
    tagFilter: (tag) =>
      [
        "Auth & Session",
        "Volunteer Portal",
        "Field Visits",
        "Public Field Reports (Zero-Login)",
      ].includes(tag),
  },
  {
    key: "family",
    title: "Family (Keluarga)",
    description: "Endpoints accessible to Family Members for registering parents, managing contacts, and monitoring status.",
    tagFilter: (tag) =>
      ["Auth & Session", "Family Portal", "Family Contacts", "Public Status (Zero-Login)"].includes(tag),
  },
  {
    key: "public",
    title: "Public (Zero-Login)",
    description: "Zero-login endpoints accessible without authentication for status monitoring, field visit reports, and RT checks.",
    tagFilter: (tag) =>
      [
        "Community & Territory",
        "Public Status (Zero-Login)",
        "Public Field Reports (Zero-Login)",
      ].includes(tag),
  },
  {
    key: "all",
    title: "All (Full API)",
    description: "Complete API specification containing all endpoints and background routes.",
    tagFilter: () => true,
  },
];

export function getFilteredOpenApiSpec(fullSpec: any, roleKey: RoleGroupKey) {
  const group = ROLE_GROUPS.find((g) => g.key === roleKey) || ROLE_GROUPS[ROLE_GROUPS.length - 1];

  if (roleKey === "all" || !fullSpec) {
    return fullSpec;
  }

  const filteredPaths: Record<string, any> = {};

  if (fullSpec.paths) {
    for (const [pathKey, pathItem] of Object.entries(fullSpec.paths)) {
      if (typeof pathItem === "object" && pathItem !== null) {
        const filteredPathItem: Record<string, any> = {};
        for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
          if (["get", "post", "put", "patch", "delete", "options", "head"].includes(method.toLowerCase())) {
            const op = operation as { tags?: string[] };
            const tags = op.tags || [];
            if (tags.some((t) => group.tagFilter(t))) {
              filteredPathItem[method] = operation;
            }
          }
        }
        if (Object.keys(filteredPathItem).length > 0) {
          filteredPaths[pathKey] = filteredPathItem;
        }
      }
    }
  }

  return {
    ...fullSpec,
    info: {
      ...fullSpec.info,
      title: `Kabarin API — ${group.title}`,
      description: `${fullSpec.info?.description || ""}\n\n**Scope:** ${group.description}`,
    },
    paths: filteredPaths,
  };
}

export function renderScalarHtml(fullSpec: any): string {
  const sources = ROLE_GROUPS.map((g) => ({
    title: g.title,
    slug: g.key,
    default: g.default ?? false,
    content: getFilteredOpenApiSpec(fullSpec, g.key),
  }));

  const configJson = JSON.stringify(
    {
      theme: "kepler",
      layout: "modern",
      sources,
    },
    null,
    2
  );

  return `<!doctype html>
<html>
  <head>
    <title>Kabarin API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://kabarin.pages.dev/favicon.svg" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', ${configJson});
    </script>
  </body>
</html>`;
}
