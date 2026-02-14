import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { usersApis } from '../apis/usersApi.js';
import { Credentials } from '../types/credentials.js';
import { Pagination } from '../types/pagination.js';
import { User } from '../types/user.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Users methods of the Tableau Server REST API
 *
 * @export
 * @class UsersMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_users_and_groups.htm
 */
export default class UsersMethods extends AuthenticatedMethods<typeof usersApis> {
  constructor(baseUrl: string, creds: Credentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, usersApis, { axiosConfig }), creds);
  }

  /**
   * Returns the users on a site.
   *
   * Required scopes: `tableau:users:read`
   *
   * @param siteId - The Tableau site ID
   * @param filter - The filter string to filter users by
   * @param pageSize - The number of items to return in one response. The minimum is 1. The maximum is 1000. The default is 100.
   * @param pageNumber - The offset for paging. The default is 1.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_users_and_groups.htm#get_users_on_site
   */
  queryUsersForSite = async ({
    siteId,
    filter,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    filter: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: Pagination; users: User[] }> => {
    const response = await this._apiClient.queryUsersForSite({
      params: { siteId },
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination,
      users: response.users.user ?? [],
    };
  };
}
