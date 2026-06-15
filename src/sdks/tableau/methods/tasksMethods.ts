import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { tasksApis } from '../apis/tasksApi.js';
import { Credentials } from '../types/credentials.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Tasks methods of the Tableau Server REST API
 *
 * @export
 * @class TasksMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_extract_and_encryption.htm
 */
export default class TasksMethods extends AuthenticatedMethods<typeof tasksApis> {
  constructor(baseUrl: string, creds: Credentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, tasksApis, { axiosConfig }), creds);
  }

  /**
   * Returns a list of extract refresh tasks on the specified site.
   *
   * Required scopes: `tableau:tasks:read`
   */
  listExtractRefreshTasks = async ({
    siteId,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: { pageNumber: number; pageSize: number; totalAvailable: number }; tasks: Array<Record<string, unknown>> }> => {
    const response = await this._apiClient.listExtractRefreshTasks({
      params: { siteId },
      queries: { pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination ?? { pageNumber: 1, pageSize: 100, totalAvailable: 0 },
      tasks: response.tasks?.task ?? [],
    };
  };

  /**
   * Runs the specified extract refresh task.
   *
   * Required scopes: `tableau:tasks:run`
   */
  runExtractRefresh = async ({
    siteId,
    taskId,
  }: {
    siteId: string;
    taskId: string;
  }): Promise<Record<string, unknown>> => {
    const response = await this._apiClient.runExtractRefresh(undefined, {
      params: { siteId, taskId },
      ...this.authHeader,
    });
    return response;
  };
}
