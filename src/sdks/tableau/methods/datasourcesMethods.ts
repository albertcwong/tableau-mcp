import { Zodios } from '@zodios/core';

import { getStringResponseHeader } from '../../../utils/axios.js';
import { AxiosRequestConfig } from '../../../utils/axios.js';
import { datasourcesApis } from '../apis/datasourcesApi.js';
import {
  buildPublishMultipartBody,
  buildPublishRequestOnlyBody,
  escapeXml,
  APPEND_CHUNK_MAX_BYTES,
  SINGLE_CALL_PUBLISH_LIMIT_BYTES,
} from '../utils/publishMultipart.js';
import { parsePublishResponseXml } from '../utils/parsePublishResponse.js';
import { Credentials } from '../types/credentials.js';
import { DataSource } from '../types/dataSource.js';
import { Pagination } from '../types/pagination.js';
import AuthenticatedMethods from './authenticatedMethods.js';
import FileUploadsMethods from './fileUploadsMethods.js';

/**
 * Data Sources methods of the Tableau Server REST API
 *
 * @export
 * @class DatasourcesMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_data_sources.htm
 */
export default class DatasourcesMethods extends AuthenticatedMethods<typeof datasourcesApis> {
  constructor(
    baseUrl: string,
    creds: Credentials,
    axiosConfig: AxiosRequestConfig,
    private readonly _fileUploads: FileUploadsMethods,
  ) {
    super(new Zodios(baseUrl, datasourcesApis, { axiosConfig }), creds);
  }

  /**
   * Downloads a datasource as .tdsx. Required scope: tableau:content:read
   */
  downloadDatasourceContent = async ({
    siteId,
    datasourceId,
    includeExtract = true,
  }: {
    siteId: string;
    datasourceId: string;
    includeExtract?: boolean;
  }): Promise<{ data: ArrayBuffer; filename: string }> => {
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const qs = includeExtract ? '' : '?includeExtract=False';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/datasources/${datasourceId}/content${qs}`;
    const res = await this._apiClient.axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      ...this.authHeader,
    });
    const cd = getStringResponseHeader(res.headers, 'content-disposition');
    const filename =
      cd.match(/filename="([^"]+)"/)?.[1] ?? cd.match(/filename=([^;]+)/)?.[1]?.trim() ?? 'datasource.tdsx';
    return { data: res.data, filename };
  };

  /**
   * Returns a list of published data sources on the specified site.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param siteId - The Tableau site ID
   * @param filter - The filter string to filter datasources by
   * @param pageSize - The number of items to return in one response. The minimum is 1. The maximum is 1000. The default is 100.
   * @param pageNumber - The offset for paging. The default is 1.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_data_sources.htm#query_data_sources
   */
  listDatasources = async ({
    siteId,
    filter,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    filter: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: Pagination; datasources: DataSource[] }> => {
    const response = await this._apiClient.listDatasources({
      params: { siteId },
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination,
      datasources: response.datasources.datasource ?? [],
    };
  };

  /**
   * Returns information about the specified data source.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param siteId - The Tableau site ID
   * @param datasourceId - The ID of the data source
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_data_sources.htm#query_data_source
   */
  queryDatasource = async ({
    siteId,
    datasourceId,
  }: {
    siteId: string;
    datasourceId: string;
  }): Promise<DataSource> => {
    return (
      await this._apiClient.queryDatasource({
        params: { siteId, datasourceId },
        ...this.authHeader,
      })
    ).datasource;
  };

  /**
   * Publishes a datasource. Required scope: tableau:datasources:create.
   * For contentBase64 >64MB uses multi-part upload (also needs tableau:file_uploads:create).
   */
  publishDatasource = async ({
    siteId,
    projectId,
    name,
    contentBase64,
    uploadSessionId,
    overwrite = false,
    append = false,
  }: {
    siteId: string;
    projectId: string;
    name: string;
    contentBase64?: string;
    uploadSessionId?: string;
    overwrite?: boolean;
    append?: boolean;
  }): Promise<Record<string, string>> => {
    const filename = name.endsWith('.tdsx') ? name : `${name}.tdsx`;
    const datasourceType = filename.endsWith('.tdsx') ? 'tdsx' : filename.endsWith('.tds') ? 'tds' : 'tdsx';

    if (uploadSessionId) {
      return this._publishDatasourceWithSession({
        siteId,
        projectId,
        name,
        uploadSessionId,
        datasourceType,
        overwrite,
        append,
      });
    }

    const fileContent = Buffer.from(contentBase64!, 'base64');
    if (fileContent.length > SINGLE_CALL_PUBLISH_LIMIT_BYTES) {
      const sessionId = await this._fileUploads.initiateFileUpload({ siteId });
      const chunks = Math.ceil(fileContent.length / APPEND_CHUNK_MAX_BYTES);
      for (let i = 0; i < chunks; i++) {
        const start = i * APPEND_CHUNK_MAX_BYTES;
        const chunk = fileContent.subarray(start, Math.min(start + APPEND_CHUNK_MAX_BYTES, fileContent.length));
        await this._fileUploads.appendToFileUpload({
          siteId,
          uploadSessionId: sessionId,
          sequenceId: i + 1,
          filename,
          fileContent: chunk,
        });
      }
      return this._publishDatasourceWithSession({
        siteId,
        projectId,
        name,
        uploadSessionId: sessionId,
        datasourceType,
        overwrite,
        append,
      });
    }

    const payload = `<tsRequest><datasource name="${escapeXml(name)}"><project id="${escapeXml(projectId)}"/></datasource></tsRequest>`;
    const { body, boundary } = buildPublishMultipartBody({
      requestPayload: payload,
      filePartName: 'tableau_datasource',
      filename,
      fileContent,
    });
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const params = new URLSearchParams();
    if (overwrite) params.set('overwrite', 'true');
    if (append) params.set('append', 'true');
    const qs = params.toString();
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/datasources${qs ? `?${qs}` : ''}`;
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
   * Incrementally updates data (insert, update, upsert, replace, delete) in a published live-to-Hyper datasource.
   * Required scope: tableau:hyper_data:update. Also needs tableau:file_uploads:create for the payload upload.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_data_sources.htm#update_data_in_hyper_data_source
   */
  updateDatasourceData = async ({
    siteId,
    datasourceId,
    connectionId,
    uploadSessionId,
    actions,
    requestId,
  }: {
    siteId: string;
    datasourceId: string;
    connectionId?: string;
    uploadSessionId: string;
    actions: Array<Record<string, unknown>>;
    requestId: string;
  }): Promise<{ jobId: string }> => {
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const path = connectionId
      ? `sites/${siteId}/datasources/${datasourceId}/connections/${connectionId}/data`
      : `sites/${siteId}/datasources/${datasourceId}/data`;
    const url = `${String(baseUrl).replace(/\/$/, '')}/${path}?uploadSessionId=${encodeURIComponent(uploadSessionId)}`;
    const res = await this._apiClient.axios.patch<{ job?: { id?: string }; 'job-id'?: string }>(url, { actions }, {
      ...this.authHeader,
      headers: {
        ...this.authHeader.headers,
        'Content-Type': 'application/json',
        RequestID: requestId,
      },
      responseType: 'json',
    });
    const jobId = res.data?.job?.id ?? res.data?.['job-id'];
    if (!jobId) throw new Error('Update datasource data did not return jobId');
    return { jobId };
  };

  private _publishDatasourceWithSession = async ({
    siteId,
    projectId,
    name,
    uploadSessionId,
    datasourceType,
    overwrite,
    append,
  }: {
    siteId: string;
    projectId: string;
    name: string;
    uploadSessionId: string;
    datasourceType: string;
    overwrite: boolean;
    append: boolean;
  }): Promise<Record<string, string>> => {
    const payload = `<tsRequest><datasource name="${escapeXml(name)}"><project id="${escapeXml(projectId)}"/></datasource></tsRequest>`;
    const { body, boundary } = buildPublishRequestOnlyBody(payload);
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const params = new URLSearchParams({ uploadSessionId, datasourceType });
    if (overwrite) params.set('overwrite', 'true');
    if (append) params.set('append', 'true');
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/datasources?${params}`;
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
