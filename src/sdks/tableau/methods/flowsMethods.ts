import { Zodios } from '@zodios/core';

import { getStringResponseHeader } from '../../../utils/axios.js';
import { AxiosRequestConfig } from '../../../utils/axios.js';
import { flowsApis } from '../apis/flowsApi.js';
import { buildPublishMultipartBody, escapeXml } from '../utils/publishMultipart.js';
import { parsePublishResponseXml } from '../utils/parsePublishResponse.js';
import { Credentials } from '../types/credentials.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Flows methods of the Tableau Server REST API
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm
 */
export default class FlowsMethods extends AuthenticatedMethods<typeof flowsApis> {
  constructor(baseUrl: string, creds: Credentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, flowsApis, { axiosConfig }), creds);
  }

  /**
   * Downloads a flow as .tflx. Required scope: tableau:flows:download
   */
  downloadFlowContent = async ({
    siteId,
    flowId,
  }: {
    siteId: string;
    flowId: string;
  }): Promise<{ data: ArrayBuffer; filename: string }> => {
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/flows/${flowId}/content`;
    const res = await this._apiClient.axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      ...this.authHeader,
    });
    const cd = getStringResponseHeader(res.headers, 'content-disposition');
    const filename =
      cd.match(/filename="([^"]+)"/)?.[1] ?? cd.match(/filename=([^;]+)/)?.[1]?.trim() ?? 'flow.tflx';
    return { data: res.data, filename };
  };

  /**
   * Publishes a flow. Required scope: tableau:flows:create
   */
  publishFlow = async ({
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
    const payload = `<tsRequest><flow name="${escapeXml(name)}"><project id="${escapeXml(projectId)}"/></flow></tsRequest>`;
    const { body, boundary } = buildPublishMultipartBody({
      requestPayload: payload,
      filePartName: 'tableau_flow',
      filename: name.endsWith('.tflx') ? name : `${name}.tflx`,
      fileContent: Buffer.from(contentBase64, 'base64'),
    });
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/flows${overwrite ? '?overwrite=true' : ''}`;
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
