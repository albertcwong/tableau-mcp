import { getGetStaleContentReportTool } from './adminInsights/getStaleContentReport.js';
import { getQueryAdminInsightsJobPerformanceTool } from './adminInsights/queryJobPerformance.js';
import { getQueryAdminInsightsSiteContentTool } from './adminInsights/querySiteContent.js';
import { getQueryAdminInsightsTsEventsTool } from './adminInsights/queryTsEvents.js';
import { getSearchContentTool } from './contentExploration/searchContent.js';
import { getDeleteDatasourceTool } from './datasources/deleteDatasource.js';
import { getListDatasourcesTool } from './datasources/listDatasources.js';
import { getPublishDatasourceTool } from './datasources/publishDatasource.js';
import { getUpdateDatasourceDataTool } from './datasources/updateDatasourceData.js';
import { getDownloadDatasourceTool } from './download/downloadDatasource.js';
import { getDownloadFlowTool } from './download/downloadFlow.js';
import { getDownloadWorkbookTool } from './download/downloadWorkbook.js';
import { getGetDownloadedFileTool } from './download/getDownloadedFile.js';
import { getDeleteExtractRefreshTaskTool } from './extractRefreshTasks/deleteExtractRefreshTask.js';
import { getListExtractRefreshTasksTool } from './extractRefreshTasks/listExtractRefreshTasks.js';
import { getRunExtractRefreshTool } from './extractRefreshTasks/runExtractRefresh.js';
import { getListFlowsTool } from './flows/listFlows.js';
import { getPublishFlowTool } from './flows/publishFlow.js';
import { getRunFlowTool } from './flows/runFlow.js';
import { getGetDatasourceMetadataTool } from './getDatasourceMetadata/getDatasourceMetadata.js';
import { getOAuthTokenTool } from './getOAuthToken/getOAuthToken.js';
import { getListJobsTool } from './jobs/listJobs.js';
import { getListProjectsTool } from './projects/listProjects.js';
import { getGeneratePulseInsightBriefTool } from './pulse/generateInsightBrief/generatePulseInsightBriefTool.js';
import { getGeneratePulseMetricValueInsightBundleTool } from './pulse/generateMetricValueInsightBundle/generatePulseMetricValueInsightBundleTool.js';
import { getListAllPulseMetricDefinitionsTool } from './pulse/listAllMetricDefinitions/listAllPulseMetricDefinitions.js';
import { getListPulseMetricDefinitionsFromDefinitionIdsTool } from './pulse/listMetricDefinitionsFromDefinitionIds/listPulseMetricDefinitionsFromDefinitionIds.js';
import { getListPulseMetricsFromMetricDefinitionIdTool } from './pulse/listMetricsFromMetricDefinitionId/listPulseMetricsFromMetricDefinitionId.js';
import { getListPulseMetricsFromMetricIdsTool } from './pulse/listMetricsFromMetricIds/listPulseMetricsFromMetricIds.js';
import { getListPulseMetricSubscriptionsTool } from './pulse/listMetricSubscriptions/listPulseMetricSubscriptions.js';
import { getQueryDatasourceTool } from './queryDatasource/queryDatasource.js';
import { getResetConsentTool } from './resetConsent/resetConsent.js';
import { getRevokeAccessTokenTool } from './revokeAccessToken/revokeAccessToken.js';
import { getListSitesTool } from './sites/listSites.js';
import { getListUsersTool } from './users/listUsers.js';
import { getGetCustomViewDataTool } from './views/getCustomViewData.js';
import { getGetCustomViewImageTool } from './views/getCustomViewImage.js';
import { getGetViewTool } from './views/getView.js';
import { getGetViewDataTool } from './views/getViewData.js';
import { getGetViewImageTool } from './views/getViewImage.js';
import { getListCustomViewsTool } from './views/listCustomViews.js';
import { getListViewsTool } from './views/listViews.js';
import { getDeleteWorkbookTool } from './workbooks/deleteWorkbook.js';
import { getGetWorkbookTool } from './workbooks/getWorkbook.js';
import { getListWorkbooksTool } from './workbooks/listWorkbooks.js';
import { getPublishWorkbookTool } from './workbooks/publishWorkbook.js';

export const webToolFactories = [
  getGetDatasourceMetadataTool,
  getOAuthTokenTool,
  getListDatasourcesTool,
  getDeleteDatasourceTool,
  getListExtractRefreshTasksTool,
  getDeleteExtractRefreshTaskTool,
  getListJobsTool,
  getListUsersTool,
  getQueryDatasourceTool,
  getListAllPulseMetricDefinitionsTool,
  getListPulseMetricDefinitionsFromDefinitionIdsTool,
  getListPulseMetricsFromMetricDefinitionIdTool,
  getListPulseMetricsFromMetricIdsTool,
  getListPulseMetricSubscriptionsTool,
  getGeneratePulseMetricValueInsightBundleTool,
  getGeneratePulseInsightBriefTool,
  getGetWorkbookTool,
  getGetViewTool,
  getGetViewDataTool,
  getGetViewImageTool,
  getListWorkbooksTool,
  getDeleteWorkbookTool,
  getListProjectsTool,
  getListViewsTool,
  getListCustomViewsTool,
  getGetCustomViewDataTool,
  getGetCustomViewImageTool,
  getSearchContentTool,
  getRevokeAccessTokenTool,
  getResetConsentTool,
  getQueryAdminInsightsTsEventsTool,
  getQueryAdminInsightsSiteContentTool,
  getQueryAdminInsightsJobPerformanceTool,
  getGetStaleContentReportTool,
  getDownloadDatasourceTool,
  getDownloadWorkbookTool,
  getDownloadFlowTool,
  getGetDownloadedFileTool,
  getPublishDatasourceTool,
  getPublishWorkbookTool,
  getPublishFlowTool,
  getUpdateDatasourceDataTool,
  getListFlowsTool,
  getRunFlowTool,
  getRunExtractRefreshTool,
  getListSitesTool,
];
