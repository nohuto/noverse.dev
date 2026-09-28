export interface PolicyElement {
  Type?: string;
  Data?: string;
  ValueName?: string | null;
  KeyPath?: string[];
  Items?: PolicyItem[];
  Required?: boolean;
  TrueValue?: string;
  FalseValue?: string;
  TrueAction?: string;
  FalseAction?: string;
  MinValue?: string;
  MaxValue?: string | null;
  MaxLength?: string;
  MaxStrings?: string;
  StoreAsText?: boolean;
  Expandable?: boolean;
  Action?: string;
  ClientExtension?: string;
}

export interface PolicyItem {
  DisplayName?: string;
  Data?: string;
  Action?: string;
  ValueList?: PolicyElement[];
}

export interface RawPolicy {
  File?: string;
  CategoryName?: string;
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
  name: string;
  displayName: string;
}

export interface PolicyCategory {
  name: string;
  displayName: string;
  parent?: string;
  file?: string;
  explainText?: string;
  path: CategorySegment[];
}

export interface SearchFields {
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
  name: string;
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

export interface PolicyColumn {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  value: (policy: Policy) => string;
}
