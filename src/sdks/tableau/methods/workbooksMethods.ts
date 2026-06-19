import { Zodios } from '@zodios/core';

import { AxiosRequestConfig, getStringResponseHeader } from '../../../utils/axios.js';
import { workbooksApis } from '../apis/workbooksApi.js';
import { RestApiCredentials } from '../restApi.js';
import { Pagination } from '../types/pagination.js';
import { Workbook } from '../types/workbook.js';
import { parsePublishResponseXml } from '../utils/parsePublishResponse.js';
import {
  APPEND_CHUNK_MAX_BYTES,
  buildPublishMultipartBody,
  buildPublishRequestOnlyBody,
  escapeXml,
  SINGLE_CALL_PUBLISH_LIMIT_BYTES,
} from '../utils/publishMultipart.js';
import AuthenticatedMethods from './authenticatedMethods.js';
import FileUploadsMethods from './fileUploadsMethods.js';

/**
 * Workbooks methods of the Tableau Server REST API
 *
 * @export
 * @class WorkbooksMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm
 */
export default class WorkbooksMethods extends AuthenticatedMethods<typeof workbooksApis> {
  constructor(
    baseUrl: string,
    creds: RestApiCredentials,
    axiosConfig: AxiosRequestConfig,
    private readonly _fileUploads: FileUploadsMethods,
  ) {
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
      cd.match(/filename="([^"]+)"/)?.[1] ??
      cd.match(/filename=([^;]+)/)?.[1]?.trim() ??
      'workbook.twbx';
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
   * Publishes a workbook. Required scope: tableau:workbooks:create.
   * For contentBase64 >64MB uses multi-part upload (also needs tableau:file_uploads:create).
   */
  publishWorkbook = async ({
    siteId,
    projectId,
    name,
    contentBase64,
    uploadSessionId,
    overwrite = false,
  }: {
    siteId: string;
    projectId: string;
    name: string;
    contentBase64?: string;
    uploadSessionId?: string;
    overwrite?: boolean;
  }): Promise<Record<string, string>> => {
    const filename = name.endsWith('.twbx') ? name : `${name}.twbx`;
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';

    if (uploadSessionId) {
      return this._publishWorkbookWithSession({
        siteId,
        projectId,
        name,
        uploadSessionId,
        overwrite,
      });
    }

    const fileContent = Buffer.from(contentBase64!, 'base64');
    if (fileContent.length > SINGLE_CALL_PUBLISH_LIMIT_BYTES) {
      const sessionId = await this._fileUploads.initiateFileUpload({ siteId });
      const chunks = Math.ceil(fileContent.length / APPEND_CHUNK_MAX_BYTES);
      for (let i = 0; i < chunks; i++) {
        const start = i * APPEND_CHUNK_MAX_BYTES;
        const chunk = fileContent.subarray(
          start,
          Math.min(start + APPEND_CHUNK_MAX_BYTES, fileContent.length),
        );
        await this._fileUploads.appendToFileUpload({
          siteId,
          uploadSessionId: sessionId,
          sequenceId: i + 1,
          filename,
          fileContent: chunk,
        });
      }
      return this._publishWorkbookWithSession({
        siteId,
        projectId,
        name,
        uploadSessionId: sessionId,
        overwrite,
      });
    }

    const payload = `<tsRequest><workbook name="${escapeXml(name)}" showTabs="true"><project id="${escapeXml(projectId)}"/></workbook></tsRequest>`;
    const { body, boundary } = buildPublishMultipartBody({
      requestPayload: payload,
      filePartName: 'tableau_workbook',
      filename,
      fileContent,
    });
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

  private _publishWorkbookWithSession = async ({
    siteId,
    projectId,
    name,
    uploadSessionId,
    overwrite,
  }: {
    siteId: string;
    projectId: string;
    name: string;
    uploadSessionId: string;
    overwrite: boolean;
  }): Promise<Record<string, string>> => {
    const payload = `<tsRequest><workbook name="${escapeXml(name)}" showTabs="true"><project id="${escapeXml(projectId)}"/></workbook></tsRequest>`;
    const { body, boundary } = buildPublishRequestOnlyBody(payload);
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const params = new URLSearchParams({ uploadSessionId, workbookType: 'twbx' });
    if (overwrite) params.set('overwrite', 'true');
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/workbooks?${params}`;
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

  /**
   * Deletes the specified workbook from the site.
   *
   * On Tableau Cloud the workbook is moved to the recycle bin and can be restored
   * for a limited time before permanent removal.
   *
   * Required scopes (Tableau Cloud): `tableau:workbooks:delete`
   *
   * @param workbookId - The ID of the workbook to delete.
   * @param siteId - The Tableau site ID
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm#delete_workbook
   */
  deleteWorkbook = async ({
    workbookId,
    siteId,
  }: {
    workbookId: string;
    siteId: string;
  }): Promise<void> => {
    await this._apiClient.deleteWorkbook(undefined, {
      params: { siteId, workbookId },
      ...this.authHeader,
    });
  };

  /**
   * Adds one or more tags to the specified workbook.
   *
   * Required scopes (Tableau Cloud): `tableau:workbook_tags:update`
   *
   * @param workbookId - The ID of the workbook to tag.
   * @param siteId - The Tableau site ID
   * @param tagLabels - The tag labels to add.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm#add_tags_to_workbook
   */
  addTagsToWorkbook = async ({
    workbookId,
    siteId,
    tagLabels,
  }: {
    workbookId: string;
    siteId: string;
    tagLabels: ReadonlyArray<string>;
  }): Promise<void> => {
    await this._apiClient.addTagsToWorkbook(
      { tags: { tag: tagLabels.map((label) => ({ label })) } },
      {
        params: { siteId, workbookId },
        ...this.authHeader,
      },
    );
  };
}
