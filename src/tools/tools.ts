import { getSearchContentTool } from './contentExploration/searchContent.js';
import { getDownloadDatasourceTool } from './download/downloadDatasource.js';
import { getDownloadFlowTool } from './download/downloadFlow.js';
import { getDownloadWorkbookTool } from './download/downloadWorkbook.js';
import { getPublishDatasourceTool } from './publish/publishDatasource.js';
import { getPublishFlowTool } from './publish/publishFlow.js';
import { getPublishWorkbookTool } from './publish/publishWorkbook.js';
import { getInspectDatasourceFileTool } from './inspect/inspectDatasourceFile.js';
import { getInspectFlowFileTool } from './inspect/inspectFlowFile.js';
import { getInspectWorkbookFileTool } from './inspect/inspectWorkbookFile.js';
import { getGetDatasourceMetadataTool } from './getDatasourceMetadata/getDatasourceMetadata.js';
import { getListDatasourcesTool } from './listDatasources/listDatasources.js';
import { getGeneratePulseInsightBriefTool } from './pulse/generateInsightBrief/generatePulseInsightBriefTool.js';
import { getGeneratePulseMetricValueInsightBundleTool } from './pulse/generateMetricValueInsightBundle/generatePulseMetricValueInsightBundleTool.js';
import { getListAllPulseMetricDefinitionsTool } from './pulse/listAllMetricDefinitions/listAllPulseMetricDefinitions.js';
import { getListPulseMetricDefinitionsFromDefinitionIdsTool } from './pulse/listMetricDefinitionsFromDefinitionIds/listPulseMetricDefinitionsFromDefinitionIds.js';
import { getListPulseMetricsFromMetricDefinitionIdTool } from './pulse/listMetricsFromMetricDefinitionId/listPulseMetricsFromMetricDefinitionId.js';
import { getListPulseMetricsFromMetricIdsTool } from './pulse/listMetricsFromMetricIds/listPulseMetricsFromMetricIds.js';
import { getListPulseMetricSubscriptionsTool } from './pulse/listMetricSubscriptions/listPulseMetricSubscriptions.js';
import { getQueryDatasourceTool } from './queryDatasource/queryDatasource.js';
import { getListSitesTool } from './sites/listSites.js';
import { getListUsersTool } from './users/listUsers.js';
import { getGetViewDataTool } from './views/getViewData.js';
import { getGetViewImageTool } from './views/getViewImage.js';
import { getListViewsTool } from './views/listViews.js';
import { getGetWorkbookTool } from './workbooks/getWorkbook.js';
import { getListWorkbooksTool } from './workbooks/listWorkbooks.js';

export const toolFactories = [
  getDownloadDatasourceTool,
  getDownloadFlowTool,
  getDownloadWorkbookTool,
  getGetDatasourceMetadataTool,
  getInspectDatasourceFileTool,
  getInspectFlowFileTool,
  getInspectWorkbookFileTool,
  getPublishDatasourceTool,
  getPublishFlowTool,
  getPublishWorkbookTool,
  getListDatasourcesTool,
  getQueryDatasourceTool,
  getListAllPulseMetricDefinitionsTool,
  getListPulseMetricDefinitionsFromDefinitionIdsTool,
  getListPulseMetricsFromMetricDefinitionIdTool,
  getListPulseMetricsFromMetricIdsTool,
  getListPulseMetricSubscriptionsTool,
  getGeneratePulseMetricValueInsightBundleTool,
  getGeneratePulseInsightBriefTool,
  getGetWorkbookTool,
  getGetViewDataTool,
  getGetViewImageTool,
  getListWorkbooksTool,
  getListViewsTool,
  getListUsersTool,
  getListSitesTool,
  getSearchContentTool,
];
