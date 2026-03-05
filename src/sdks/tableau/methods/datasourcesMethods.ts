import { Zodios } from '@zodios/core';

import { getStringResponseHeader } from '../../../utils/axios.js';
import { AxiosRequestConfig } from '../../../utils/axios.js';
import { datasourcesApis } from '../apis/datasourcesApi.js';
import { buildPublishMultipartBody, escapeXml } from '../utils/publishMultipart.js';
import { parsePublishResponseXml } from '../utils/parsePublishResponse.js';
import { Credentials } from '../types/credentials.js';
import { DataSource } from '../types/dataSource.js';
import { Pagination } from '../types/pagination.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Data Sources methods of the Tableau Server REST API
 *
 * @export
 * @class DatasourcesMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_data_sources.htm
 */
export default class DatasourcesMethods extends AuthenticatedMethods<typeof datasourcesApis> {
  constructor(baseUrl: string, creds: Credentials, axiosConfig: AxiosRequestConfig) {
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
   * Publishes a datasource. Required scope: tableau:datasources:create
   */
  publishDatasource = async ({
    siteId,
    projectId,
    name,
    contentBase64,
    overwrite = false,
    append = false,
  }: {
    siteId: string;
    projectId: string;
    name: string;
    contentBase64: string;
    overwrite?: boolean;
    append?: boolean;
  }): Promise<Record<string, string>> => {
    const payload = `<tsRequest><datasource name="${escapeXml(name)}"><project id="${escapeXml(projectId)}"/></datasource></tsRequest>`;
    const { body, boundary } = buildPublishMultipartBody({
      requestPayload: payload,
      filePartName: 'tableau_datasource',
      filename: name.endsWith('.tdsx') ? name : `${name}.tdsx`,
      fileContent: Buffer.from(contentBase64, 'base64'),
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
}
