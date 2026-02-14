import { z } from 'zod';

import {
  FilterOperator,
  FilterOperatorSchema,
  parseAndValidateFilterString,
} from '../../utils/parseAndValidateFilterString.js';

const FilterFieldSchema = z.enum([
  'name',
  'siteRole',
  'lastLogin',
  'externalAuthUserId',
  'authSetting',
]);

type FilterField = z.infer<typeof FilterFieldSchema>;

const allowedOperatorsByField: Record<FilterField, FilterOperator[]> = {
  name: ['eq', 'in'],
  siteRole: ['eq', 'in'],
  lastLogin: ['eq', 'gt', 'gte', 'lt', 'lte'],
  externalAuthUserId: ['eq', 'in'],
  authSetting: ['eq', 'in'],
};

const _FilterExpressionSchema = z.object({
  field: FilterFieldSchema,
  operator: FilterOperatorSchema,
  value: z.string(),
});

type FilterExpression = z.infer<typeof _FilterExpressionSchema>;

export function parseAndValidateUsersFilterString(filterString: string): string {
  return parseAndValidateFilterString<FilterField, FilterExpression>({
    filterString,
    allowedOperatorsByField,
    filterFieldSchema: FilterFieldSchema,
  });
}

export const exportedForTesting = {
  FilterFieldSchema,
};
