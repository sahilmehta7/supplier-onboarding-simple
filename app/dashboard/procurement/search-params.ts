import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type inferParserType,
} from "nuqs/server";

const serverParsers = {
  search: parseAsString.withDefault(""),
  entity: parseAsArrayOf(parseAsString).withDefault([]),
  geography: parseAsArrayOf(parseAsString).withDefault([]),
  status: parseAsArrayOf(parseAsString).withDefault([]),
  owner: parseAsArrayOf(parseAsString).withDefault([]),
  submittedFrom: parseAsString,
  submittedTo: parseAsString,
  sort: parseAsString.withDefault("submittedAt:desc"),
  page: parseAsInteger.withDefault(1),
};

export type ProcurementSearchParams = inferParserType<typeof serverParsers>;

export const procurementSearchParamsCache =
  createSearchParamsCache(serverParsers);

