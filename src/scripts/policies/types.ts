export type ValueType = 'Decimal' | 'LongDecimal' | 'String' | 'Delete';

export interface PolicyElement {
  Type?: string;
  ValueType?: ValueType;
  Data?: string;
  ValueName?: string | null;
  KeyPath?: string[];
  Items?: PolicyItem[];
  Required?: boolean;
  TrueType?: ValueType;
  TrueValue?: string;
  FalseType?: ValueType;
  FalseValue?: string;
  TrueList?: PolicyElement[];
  FalseList?: PolicyElement[];
  MinValue?: string;
  MaxValue?: string | null;
  MaxLength?: string;
  MaxStrings?: string;
  StoreAsText?: boolean;
  Expandable?: boolean;
  Additive?: boolean;
  ExplicitValue?: boolean;
  ValuePrefix?: string;
  Soft?: boolean;
  ClientExtension?: string;
}

interface PolicyItem {
  DisplayName?: string;
  ValueType?: ValueType;
  Data?: string;
  ValueList?: PolicyElement[];
}

export interface RawPolicy {
  File?: string;
  CategoryName?: string;
  CategoryKey?: string;
  PolicyName?: string;
  Class?: string;
  NameSpace?: string;
  Supported?: string;
  DisplayName?: string;
  ExplainText?: string;
  KeyPath?: string[];
  ValueName?: string;
  Elements?: PolicyElement[];
  ClientExtension?: string;
}

export interface CategorySegment {
  key: string;
  name: string;
  displayName: string;
}

export interface PolicyCategory {
  name: string;
  displayName: string;
  parent?: string;
  file?: string;
  explainText?: string;
  missing?: boolean;
  path: CategorySegment[];
}

interface SearchFields {
  names: string[];
  registry?: string[];
  details?: string[];
}

export interface Policy extends RawPolicy {
  id: string;
  shareId: string;
  scope: string;
  categoryPath: CategorySegment[];
  categoryPathKey: string;
  categoryDisplayPath: string;
  searchFields: SearchFields;
  searchFieldsLower: SearchFields;
}

export interface PolicyPayload {
  data: RawPolicy[];
  categories: Record<string, PolicyCategory>;
  categoryWarning: string;
}

export interface CategoryNode {
  key: string;
  label: string;
  categoryKey: string;
  count: number;
  children: Map<string, CategoryNode>;
}

export interface MetaItem {
  label: string;
  values: string[];
}

export interface StorageRow {
  type: string;
  registryType: string;
  label: string;
  value: string;
}

export interface StorageEntry {
  key: string;
  valueName: string;
  copyValue: string | null;
  meta: MetaItem[];
  rows: StorageRow[];
}

export interface SearchOptions {
  wildcards: boolean;
  whole: boolean;
  caseSensitive: boolean;
  matchAny: boolean;
  currentPath: boolean;
  names: boolean;
  registry: boolean;
  details: boolean;
}

export interface PolicyColumn {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  filterable?: boolean;
  value: (policy: Policy) => string;
}
