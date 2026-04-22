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
  'inspect-workbook-file',
  'inspect-datasource-file',
  'inspect-flow-file',
  'update-datasource-data',
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
] as const;
export type ToolGroupName = (typeof toolGroupNames)[number];

export const toolGroups = {
  datasource: [
    'list-datasources',
    'get-datasource-metadata',
    'query-datasource',
    'download-datasource',
    'publish-datasource',
    'inspect-datasource-file',
    'get-downloaded-file',
    'update-datasource-data',
  ],
  workbook: [
    'list-workbooks',
    'get-workbook',
    'download-workbook',
    'publish-workbook',
    'inspect-workbook-file',
  ],
  view: ['list-views', 'get-view-data', 'get-view-image'],
  flow: ['download-flow', 'publish-flow', 'inspect-flow-file'],
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
} as const satisfies Record<ToolGroupName, Array<ToolName>>;

export function isToolName(value: unknown): value is ToolName {
  return !!toolNames.find((name) => name === value);
}

export function isToolGroupName(value: unknown): value is ToolGroupName {
  return !!toolGroupNames.find((name) => name === value);
}
