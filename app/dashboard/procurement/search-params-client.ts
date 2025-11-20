import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type inferParserType,
} from "nuqs";

export const procurementClientParsers = {
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

export type ProcurementClientQueryState = inferParserType<
  typeof procurementClientParsers
>;

