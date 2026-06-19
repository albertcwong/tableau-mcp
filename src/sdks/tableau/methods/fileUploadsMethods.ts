import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { fileUploadsApis } from '../apis/fileUploadsApi.js';
import { RestApiCredentials } from '../restApi.js';
import { parseFileUploadResponseXml } from '../utils/parsePublishResponse.js';
import { buildAppendMultipartBody } from '../utils/publishMultipart.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * File uploads methods for multi-part publish (workbooks, datasources, flows).
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_publish.htm
 */
export default class FileUploadsMethods extends AuthenticatedMethods<typeof fileUploadsApis> {
  constructor(baseUrl: string, creds: RestApiCredentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, fileUploadsApis, { axiosConfig }), creds);
  }

  /** Initiate file upload. Returns uploadSessionId. Required scope: tableau:file_uploads:create */
  initiateFileUpload = async ({ siteId }: { siteId: string }): Promise<string> => {
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/fileUploads`;
    const res = await this._apiClient.axios.post<string>(url, undefined, {
      ...this.authHeader,
      responseType: 'text',
    });
    const sessionId = parseFileUploadResponseXml(res.data);
    if (!sessionId) throw new Error('Initiate file upload did not return uploadSessionId');
    return sessionId;
  };

  /** Append a chunk to the upload. Max 64MB per chunk. Required scope: tableau:file_uploads:create */
  appendToFileUpload = async ({
    siteId,
    uploadSessionId,
    sequenceId,
    filename,
    fileContent,
  }: {
    siteId: string;
    uploadSessionId: string;
    sequenceId: number;
    filename: string;
    fileContent: Buffer;
  }): Promise<void> => {
    const baseUrl = this._apiClient.axios.defaults.baseURL ?? '';
    const url = `${String(baseUrl).replace(/\/$/, '')}/sites/${siteId}/fileUploads/${uploadSessionId}?sequenceID=${sequenceId}`;
    const { body, boundary } = buildAppendMultipartBody({ filename, fileContent });
    await this._apiClient.axios.put(url, body, {
      ...this.authHeader,
      headers: {
        ...this.authHeader.headers,
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
      },
      responseType: 'text',
    });
  };
}
