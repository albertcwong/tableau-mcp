import { Zodios } from '@zodios/core';

import { AxiosRequestConfig, getStringResponseHeader } from '../../../utils/axios.js';
import { flowsApis } from '../apis/flowsApi.js';
import { RestApiCredentials } from '../restApi.js';
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
 * Flows methods of the Tableau Server REST API
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm
 */
export default class FlowsMethods extends AuthenticatedMethods<typeof flowsApis> {
  constructor(
    baseUrl: string,
    creds: RestApiCredentials,
    axiosConfig: AxiosRequestConfig,
    private readonly _fileUploads: FileUploadsMethods,
  ) {
    super(new Zodios(baseUrl, flowsApis, { axiosConfig }), creds);
  }

  /**
   * Returns a list of flows on the specified site.
   *
   * Required scopes: `tableau:content:read`
   */
  listFlows = async ({
    siteId,
    filter,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    filter?: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{
    pagination: { pageNumber: number; pageSize: number; totalAvailable: number };
    flows: Array<Record<string, unknown>>;
  }> => {
    const response = await this._apiClient.listFlows({
      params: { siteId },
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination ?? { pageNumber: 1, pageSize: 100, totalAvailable: 0 },
      flows: response.flows?.flow ?? [],
    };
  };

  /**
   * Runs the specified flow.
   *
   * Required scopes: `tableau:tasks:run`
   */
  runFlow = async ({
    siteId,
    flowId,
  }: {
    siteId: string;
    flowId: string;
  }): Promise<Record<string, unknown>> => {
    const response = await this._apiClient.runFlow(undefined, {
      params: { siteId, flowId },
      ...this.authHeader,
    });
    return response;
  };

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
      cd.match(/filename="([^"]+)"/)?.[1] ??
      cd.match(/filename=([^;]+)/)?.[1]?.trim() ??
      'flow.tflx';
    return { data: res.data, filename };
  };

  /**
   * Publishes a flow. Required scope: tableau:flows:create.
   * For contentBase64 >64MB uses multi-part upload (also needs tableau:file_uploads:create).
   */
  publishFlow = async ({
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
    const filename = name.endsWith('.tflx') ? name : `${name}.tflx`;

    if (uploadSessionId) {
      return this._publishFlowWithSession({ siteId, projectId, name, uploadSessionId, overwrite });
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
      return this._publishFlowWithSession({
        siteId,
        projectId,
        name,
        uploadSessionId: sessionId,
        overwrite,
      });
    }

    const payload = `<tsRequest><flow name="${escapeXml(name)}"><project id="${escapeXml(projectId)}"/></flow></tsRequest>`;
    const { body, boundary } = buildPublishMultipartBody({
      requestPayload: payload,
      filePartName: 'tableau_flow',
      filename,
      fileContent,
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

  private _publishFlowWithSession = async ({
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
    const payload = `<tsRequest><flow name="${escapeXml(name)}"><project id="${escapeXml(projectId)}"/></flow></tsRequest>`;
    const { body, boundary } = buildPublishRequestOnlyBody(payload);
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const params = new URLSearchParams({ uploadSessionId, flowType: 'tflx' });
    if (overwrite) params.set('overwrite', 'true');
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/flows?${params}`;
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
