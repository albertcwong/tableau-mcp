export const toolNames = [
  'list-datasources',
  'list-projects',
  'list-workbooks',
  'list-views',
  'query-datasource',
  'get-datasource-metadata',
  'get-workbook',
  'get-view-data',
  'get-view-image',
  'list-all-pulse-metric-definitions',
  'list-pulse-metric-definitions-from-definition-ids',
  'list-pulse-metrics-from-metric-definition-id',
  'list-pulse-metrics-from-metric-ids',
  'list-pulse-metric-subscriptions',
  'generate-pulse-metric-value-insight-bundle',
  'generate-pulse-insight-brief',
  'search-content',
  'list-users',
  'list-sites',
  'download-workbook',
  'download-datasource',
  'download-flow',
  'get-downloaded-file',
  'publish-workbook',
  'publish-datasource',
  'publish-flow',
  'update-datasource-data',
  'list-flows',
  'run-flow',
  'list-extract-refresh-tasks',
  'run-extract-refresh',
] as const;
export type ToolName = (typeof toolNames)[number];

export const toolGroupNames = [
  'datasource',
  'workbook',
  'view',
  'flow',
  'projects',
  'pulse',
  'content-exploration',
  'users',
  'sites',
  'tasks',
] as const;
export type ToolGroupName = (typeof toolGroupNames)[number];

export const toolGroups = {
  datasource: [
    'list-datasources',
    'get-datasource-metadata',
    'query-datasource',
    'download-datasource',
    'publish-datasource',
    'get-downloaded-file',
    'update-datasource-data',
  ],
  workbook: [
    'list-workbooks',
    'get-workbook',
    'download-workbook',
    'publish-workbook',
  ],
  view: ['list-views', 'get-view-data', 'get-view-image'],
  flow: ['download-flow', 'publish-flow', 'list-flows', 'run-flow'],
  projects: ['list-projects'],
  pulse: [
    'list-all-pulse-metric-definitions',
    'list-pulse-metric-definitions-from-definition-ids',
    'list-pulse-metrics-from-metric-definition-id',
    'list-pulse-metrics-from-metric-ids',
    'list-pulse-metric-subscriptions',
    'generate-pulse-metric-value-insight-bundle',
    'generate-pulse-insight-brief',
  ],
  'content-exploration': ['search-content'],
  users: ['list-users'],
  sites: ['list-sites'],
  tasks: ['list-extract-refresh-tasks', 'run-extract-refresh'],
} as const satisfies Record<ToolGroupName, Array<ToolName>>;

export function isToolName(value: unknown): value is ToolName {
  return !!toolNames.find((name) => name === value);
}

export function isToolGroupName(value: unknown): value is ToolGroupName {
  return !!toolGroupNames.find((name) => name === value);
}
