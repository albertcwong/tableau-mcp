import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { sitesApis } from '../apis/sitesApi.js';
import { Credentials } from '../types/credentials.js';
import { Pagination } from '../types/pagination.js';
import { Site } from '../types/site.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Sites methods of the Tableau Server REST API
 *
 * @export
 * @class SitesMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_sites.htm
 */
export default class SitesMethods extends AuthenticatedMethods<typeof sitesApis> {
  constructor(baseUrl: string, creds: Credentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, sitesApis, { axiosConfig }), creds);
  }

  /**
   * Returns a list of sites on the server.
   *
   * Required scopes: `tableau:sites:read`
   *
   * @param filter - The filter string to filter sites by
   * @param pageSize - The number of items to return in one response. The minimum is 1. The maximum is 1000. The default is 100.
   * @param pageNumber - The offset for paging. The default is 1.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_sites.htm#query_sites
   */
  querySites = async ({
    filter,
    pageSize,
    pageNumber,
  }: {
    filter?: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: Pagination; sites: Site[] }> => {
    const response = await this._apiClient.querySites({
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination,
      sites: response.sites.site ?? [],
    };
  };
}
