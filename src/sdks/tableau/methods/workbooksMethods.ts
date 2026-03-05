import { Zodios } from '@zodios/core';

import { getStringResponseHeader } from '../../../utils/axios.js';
import { AxiosRequestConfig } from '../../../utils/axios.js';
import { workbooksApis } from '../apis/workbooksApi.js';
import { Credentials } from '../types/credentials.js';
import { Pagination } from '../types/pagination.js';
import { Workbook } from '../types/workbook.js';
import { buildPublishMultipartBody, escapeXml } from '../utils/publishMultipart.js';
import { parsePublishResponseXml } from '../utils/parsePublishResponse.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Workbooks methods of the Tableau Server REST API
 *
 * @export
 * @class WorkbooksMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm
 */
export default class WorkbooksMethods extends AuthenticatedMethods<typeof workbooksApis> {
  constructor(baseUrl: string, creds: Credentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, workbooksApis, { axiosConfig }), creds);
  }

  /**
   * Downloads a workbook as .twbx. Required scope: tableau:workbooks:download
   */
  downloadWorkbookContent = async ({
    siteId,
    workbookId,
    includeExtract = true,
  }: {
    siteId: string;
    workbookId: string;
    includeExtract?: boolean;
  }): Promise<{ data: ArrayBuffer; filename: string }> => {
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const qs = includeExtract ? '' : '?includeExtract=False';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/workbooks/${workbookId}/content${qs}`;
    const res = await this._apiClient.axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      ...this.authHeader,
    });
    const cd = getStringResponseHeader(res.headers, 'content-disposition');
    const filename =
      cd.match(/filename="([^"]+)"/)?.[1] ?? cd.match(/filename=([^;]+)/)?.[1]?.trim() ?? 'workbook.twbx';
    return { data: res.data, filename };
  };

  /**
   * Returns information about the specified workbook, including information about views and tags.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param {string} workbookId The ID of the workbook to return information for.
   * @param {string} siteId - The Tableau site ID
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm#query_workbook
   */
  getWorkbook = async ({
    workbookId,
    siteId,
  }: {
    workbookId: string;
    siteId: string;
  }): Promise<Workbook> => {
    return (
      await this._apiClient.getWorkbook({
        params: { siteId, workbookId },
        ...this.authHeader,
      })
    ).workbook;
  };

  /**
   * Returns the workbooks on a site.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param siteId - The Tableau site ID
   * @param filter - The filter string to filter workbooks by
   * @param pageSize - The number of items to return in one response. The minimum is 1. The maximum is 1000. The default is 100.
   * @param pageNumber - The offset for paging. The default is 1.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm#query_workbooks_for_site
   */
  queryWorkbooksForSite = async ({
    siteId,
    filter,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    filter: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: Pagination; workbooks: Workbook[] }> => {
    const response = await this._apiClient.queryWorkbooksForSite({
      params: { siteId },
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination,
      workbooks: response.workbooks.workbook ?? [],
    };
  };

  /**
   * Publishes a workbook. Required scope: tableau:workbooks:create
   */
  publishWorkbook = async ({
    siteId,
    projectId,
    name,
    contentBase64,
    overwrite = false,
  }: {
    siteId: string;
    projectId: string;
    name: string;
    contentBase64: string;
    overwrite?: boolean;
  }): Promise<Record<string, string>> => {
    const payload = `<tsRequest><workbook name="${escapeXml(name)}" showTabs="true"><project id="${escapeXml(projectId)}"/></workbook></tsRequest>`;
    const { body, boundary } = buildPublishMultipartBody({
      requestPayload: payload,
      filePartName: 'tableau_workbook',
      filename: name.endsWith('.twbx') ? name : `${name}.twbx`,
      fileContent: Buffer.from(contentBase64, 'base64'),
    });
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/workbooks${overwrite ? '?overwrite=true' : ''}`;
    const res = await this._apiClient.axios.post<string>(url, body, {
      ...this.authHeader,
      headers: {
        ...this.authHeader.headers,
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
      },
      responseType: 'text',
    });
    return parsePublishResponseXml(res.data);
  };
}
