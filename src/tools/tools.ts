import { getSearchContentTool } from './contentExploration/searchContent.js';
import { getDownloadDatasourceTool } from './download/downloadDatasource.js';
import { getDownloadFlowTool } from './download/downloadFlow.js';
import { getDownloadWorkbookTool } from './download/downloadWorkbook.js';
import { getGetDownloadedFileTool } from './download/getDownloadedFile.js';
import { getPublishDatasourceTool } from './publish/publishDatasource.js';
import { getUpdateDatasourceDataTool } from './updateDatasourceData/updateDatasourceData.js';
import { getPublishFlowTool } from './publish/publishFlow.js';
import { getPublishWorkbookTool } from './publish/publishWorkbook.js';
import { getGetDatasourceMetadataTool } from './getDatasourceMetadata/getDatasourceMetadata.js';
import { getListDatasourcesTool } from './listDatasources/listDatasources.js';
import { getListProjectsTool } from './listProjects/listProjects.js';
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
import { getListFlowsTool } from './listFlows/listFlows.js';
import { getRunFlowTool } from './runFlow/runFlow.js';
import { getListExtractRefreshTasksTool } from './listExtractRefreshTasks/listExtractRefreshTasks.js';
import { getRunExtractRefreshTool } from './runExtractRefresh/runExtractRefresh.js';

export const toolFactories = [
  getDownloadDatasourceTool,
  getDownloadFlowTool,
  getDownloadWorkbookTool,
  getGetDownloadedFileTool,
  getGetDatasourceMetadataTool,
  getPublishDatasourceTool,
  getUpdateDatasourceDataTool,
  getPublishFlowTool,
  getPublishWorkbookTool,
  getListDatasourcesTool,
  getListProjectsTool,
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
  getListFlowsTool,
  getRunFlowTool,
  getListExtractRefreshTasksTool,
  getRunExtractRefreshTool,
];
