import { Client } from "pg";

type QueryMode = "select" | "insert" | "upsert" | "update" | "delete";
type Filter = { column: string; operator: string; value: unknown };
type Order = { column: string; ascending: boolean; nullsFirst?: boolean; referencedTable?: string };
type Selection = { fields: string[]; relations: RelationSelection[]; wildcard: boolean };
type RelationSelection = { key: string; table: string; selection: Selection; inner: boolean };
type RelationMap = { parent: string; child: string; parentKey: string; childKey: string; many: boolean };

type QueryResponse<T = unknown> = {
  data: T;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
  count?: number | null;
};

type QueryOptions = {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
};

const TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const RELATIONS: RelationMap[] = [
  { parent: "extensions", child: "extension_versions", parentKey: "id", childKey: "extension_id", many: true },
  { parent: "watchlists", child: "watchlist_items", parentKey: "id", childKey: "watchlist_id", many: true },
  { parent: "team_members", child: "teams", parentKey: "team_id", childKey: "id", many: false },
  { parent: "team_members", child: "profiles", parentKey: "user_id", childKey: "id", many: false },
  { parent: "team_watchlist_items", child: "extensions", parentKey: "extension_id", childKey: "id", many: false },
  { parent: "team_notification_deliveries", child: "team_notification_channels", parentKey: "channel_id", childKey: "id", many: false },
  { parent: "team_notification_deliveries", child: "team_monitoring_alerts", parentKey: "alert_id", childKey: "id", many: false },
  { parent: "team_monitoring_alerts", child: "team_notification_deliveries", parentKey: "id", childKey: "alert_id", many: true },
  { parent: "scan_job_results", child: "scans", parentKey: "scan_id", childKey: "id", many: false },
  { parent: "team_notification_channels", child: "teams", parentKey: "team_id", childKey: "id", many: false },
];

function quoteIdentifier(value: string): string {
  if (!TABLE_NAME.test(value)) throw new Error(`Unsafe database identifier: ${value}`);
  return `"${value}"`;
}

function table(value: string): string {
  return `public.${quoteIdentifier(value)}`;
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  const tail = value.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parseSelection(raw: string): Selection {
  const fields: string[] = [];
  const relations: RelationSelection[] = [];
  let wildcard = false;
  for (const part of splitTopLevel(raw.trim() || "*")) {
    if (part === "*") {
      wildcard = true;
      continue;
    }
    const open = part.indexOf("(");
    if (open > 0 && part.endsWith(")")) {
      const descriptor = part.slice(0, open).trim();
      const inner = descriptor.includes("!inner");
      const withoutJoin = descriptor.replace(/!inner$/, "");
      const colon = withoutJoin.indexOf(":");
      const key = colon >= 0 ? withoutJoin.slice(0, colon).trim() : withoutJoin;
      const relationTable = colon >= 0 ? withoutJoin.slice(colon + 1).trim() : withoutJoin;
      if (!TABLE_NAME.test(key) || !TABLE_NAME.test(relationTable)) throw new Error(`Unsafe relation selection: ${part}`);
      relations.push({ key, table: relationTable, inner, selection: parseSelection(part.slice(open + 1, -1)) });
      continue;
    }
    const colon = part.indexOf(":");
    const column = colon >= 0 ? part.slice(colon + 1).trim() : part;
    if (!TABLE_NAME.test(column)) throw new Error(`Unsafe column selection: ${part}`);
    fields.push(column);
  }
  return { fields, relations, wildcard };
}

function relationFor(parent: string, child: string): RelationMap | null {
  return RELATIONS.find((candidate) => candidate.parent === parent && candidate.child === child) || null;
}

function normalizeError(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; code?: unknown; detail?: unknown; hint?: unknown };
    return {
      message: String(value.message || "Database request failed."),
      ...(value.code ? { code: String(value.code) } : {}),
      ...(value.detail ? { details: String(value.detail) } : {}),
      ...(value.hint ? { hint: String(value.hint) } : {}),
    };
  }
  return { message: error instanceof Error ? error.message : "Database request failed." };
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

function normalizeInValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [value];
  if (value.startsWith("{") && value.endsWith("}")) return value.slice(1, -1).split(",").map((item) => item.trim());
  return [value];
}

function filterSql(filter: Filter, params: unknown[]): string {
  const column = filter.column.split(".").pop() || filter.column;
  const identifier = quoteIdentifier(column);
  const operator = filter.operator;
  if (operator === "is") {
    if (String(filter.value).toLowerCase() === "null" || filter.value === null) return `${identifier} IS NULL`;
    if (String(filter.value).toLowerCase() === "true") return `${identifier} IS TRUE`;
    if (String(filter.value).toLowerCase() === "false") return `${identifier} IS FALSE`;
  }
  if (operator === "in") {
    const values = normalizeInValues(filter.value);
    if (!values.length) return "FALSE";
    const placeholders = values.map((value) => {
      params.push(value);
      return `$${params.length}`;
    });
    return `${identifier} IN (${placeholders.join(", ")})`;
  }
  if (operator === "not") {
    const [nestedOperator, nestedValue] = String(filter.value).split(".", 2);
    return `NOT (${filterSql({ column, operator: nestedOperator, value: nestedValue }, params)})`;
  }
  const sqlOperator: Record<string, string> = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", ilike: "ILIKE", like: "LIKE" };
  const selected = sqlOperator[operator];
  if (!selected) throw new Error(`Unsupported database filter: ${operator}`);
  if (isNullish(filter.value)) return `${identifier} ${selected === "=" ? "IS" : "IS NOT"} NULL`;
  params.push(filter.value);
  return `${identifier} ${selected} $${params.length}`;
}

function parseOrFilter(raw: string): Filter[][] {
  return raw.split(",").map((part) => {
    const [column, operator, ...rest] = part.split(".");
    return [{ column, operator, value: rest.join(".") }];
  });
}

function selectSql(selection: Selection, alias = "t") {
  const base = selection.wildcard ? `${alias}.*` : selection.fields.map((field) => `${alias}.${quoteIdentifier(field)}`).join(", ");
  return base || `${alias}.*`;
}

function relationFilters(filters: Filter[], relation: RelationSelection): Filter[] {
  const prefix = `${relation.key}.`;
  return filters.filter((filter) => filter.column.startsWith(prefix)).map((filter) => ({ ...filter, column: filter.column.slice(prefix.length) }));
}

function matchesInner(row: Record<string, unknown>, relation: RelationSelection, relationRows: unknown): boolean {
  if (!relation.inner) return true;
  if (Array.isArray(relationRows)) return relationRows.length > 0;
  return Boolean(relationRows);
}

async function loadRelation(client: Client, parent: string, parents: Record<string, unknown>[], relation: RelationSelection, filters: Filter[]): Promise<Map<string, unknown>> {
  const mapping = relationFor(parent, relation.table);
  const output = new Map<string, unknown>();
  if (!mapping) return output;
  const ids = [...new Set(parents.map((row) => row[mapping.parentKey]).filter((value) => !isNullish(value)).map(String))];
  if (!ids.length) return output;
  const params: unknown[] = ids;
  const where = [`r.${quoteIdentifier(mapping.childKey)} IN (${ids.map((_, index) => `$${index + 1}`).join(", ")})`];
  for (const filter of relationFilters(filters, relation)) where.push(filterSql(filter, params).replace(/^"/, "r.\""));
  const requestedFields = new Set(relation.selection.fields);
  const relationProjection = relation.selection.wildcard
    ? "r.*"
    : [mapping.childKey, ...relation.selection.fields.filter((field) => field !== mapping.childKey)].map((field) => `r.${quoteIdentifier(field)}`).join(", ");
  const nestedBase = relationProjection || `r.${quoteIdentifier(mapping.childKey)}`;
  const sql = `SELECT ${nestedBase} FROM ${table(mapping.child)} r WHERE ${where.join(" AND ")}`;
  const result = await client.query(sql, params);
  let childRows = result.rows as Record<string, unknown>[];
  for (const nested of relation.selection.relations) {
    const nestedRows = await loadRelation(client, mapping.child, childRows, nested, filters);
    const nestedMapping = relationFor(mapping.child, nested.table);
    childRows = childRows.filter((row) => matchesInner(row, nested, nestedRows.get(String(row[nestedMapping?.parentKey || "id"]))));
    for (const row of childRows) {
      const related = nestedRows.get(String(row[nestedMapping?.parentKey || "id"]));
      row[nested.key] = related ?? (nestedMapping?.many ? [] : null);
    }
  }
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const row of childRows) {
    const key = String(row[mapping.childKey]);
    if (!relation.selection.wildcard && !requestedFields.has(mapping.childKey)) delete row[mapping.childKey];
    const items = grouped.get(key) || [];
    items.push(row);
    grouped.set(key, items);
  }
  for (const parentRow of parents) {
    const key = String(parentRow[mapping.parentKey]);
    const items = grouped.get(key) || [];
    output.set(key, mapping.many ? items : items[0] || null);
  }
  return output;
}

class PostgresQuery implements PromiseLike<QueryResponse> {
  private mode: QueryMode = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private selection: Selection = parseSelection("*");
  private filters: Filter[] = [];
  private ors: Filter[][] = [];
  private orders: Order[] = [];
  private maxRows: number | null = null;
  private offset: number | null = null;
  private cardinality: "many" | "single" | "maybeSingle" = "many";
  private options: QueryOptions = {};
  private conflictColumns: string[] = [];
  private selectionRequested = false;

  constructor(private readonly connectionString: string, private readonly tableName: string) {
    if (!TABLE_NAME.test(tableName)) throw new Error(`Unsafe database table: ${tableName}`);
  }

  select(columns = "*", options?: QueryOptions): this {
    this.selectionRequested = true;
    this.selection = parseSelection(columns);
    this.options = options || {};
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.mode = "insert";
    this.payload = values;
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): this {
    this.mode = "upsert";
    this.payload = values;
    this.conflictColumns = String(options?.onConflict || "").split(",").map((item) => item.trim()).filter(Boolean);
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.mode = "update";
    this.payload = values;
    return this;
  }

  delete(options?: QueryOptions): this {
    this.mode = "delete";
    this.options = options || {};
    return this;
  }

  eq(column: string, value: unknown): this { this.filters.push({ column, operator: "eq", value }); return this; }
  neq(column: string, value: unknown): this { this.filters.push({ column, operator: "neq", value }); return this; }
  in(column: string, value: unknown[]): this { this.filters.push({ column, operator: "in", value }); return this; }
  is(column: string, value: unknown): this { this.filters.push({ column, operator: "is", value }); return this; }
  gt(column: string, value: unknown): this { this.filters.push({ column, operator: "gt", value }); return this; }
  gte(column: string, value: unknown): this { this.filters.push({ column, operator: "gte", value }); return this; }
  lt(column: string, value: unknown): this { this.filters.push({ column, operator: "lt", value }); return this; }
  lte(column: string, value: unknown): this { this.filters.push({ column, operator: "lte", value }); return this; }
  ilike(column: string, value: unknown): this { this.filters.push({ column, operator: "ilike", value }); return this; }
  or(value: string): this { this.ors.push(...parseOrFilter(value)); return this; }
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string }): this { this.orders.push({ column, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst, referencedTable: options?.referencedTable }); return this; }
  limit(value: number): this { this.maxRows = Math.max(0, value); return this; }
  range(from: number, to: number): this { this.offset = Math.max(0, from); this.maxRows = Math.max(0, to - from + 1); return this; }
  single(): this { this.cardinality = "single"; return this; }
  maybeSingle(): this { this.cardinality = "maybeSingle"; return this; }

  then<TResult1 = QueryResponse, TResult2 = never>(onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled || undefined, onrejected || undefined);
  }

  private baseWhere(params: unknown[], includeNested = false): string {
    const clauses: string[] = [];
    for (const filter of this.filters) {
      if (!includeNested && filter.column.includes(".")) continue;
      clauses.push(filterSql(filter, params));
    }
    if (this.ors.length) {
      const groups = this.ors.map((group) => group.map((filter) => filterSql(filter, params)).join(" AND "));
      clauses.push(`(${groups.join(" OR ")})`);
    }
    return clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  }

  private async execute(): Promise<QueryResponse> {
    const client = new Client({ connectionString: this.connectionString });
    try {
      await client.connect();
      if (this.mode === "select") return await this.executeSelect(client);
      return await this.executeMutation(client);
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async executeSelect(client: Client): Promise<QueryResponse> {
    const params: unknown[] = [];
    const where = this.baseWhere(params);
    const order = this.orders.filter((item) => !item.referencedTable).map((item) => `${quoteIdentifier(item.column)} ${item.ascending ? "ASC" : "DESC"}${item.nullsFirst === undefined ? "" : item.nullsFirst ? " NULLS FIRST" : " NULLS LAST"}`).join(", ");
    const paging = `${this.maxRows === null ? "" : ` LIMIT ${this.maxRows}`}${this.offset === null ? "" : ` OFFSET ${this.offset}`}`;
    if (this.options.count && this.options.head) {
      const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM ${table(this.tableName)} t${where}`, params);
      return { data: null, count: Number(countResult.rows[0]?.count || 0), error: null };
    }
    const rowsResult = await client.query(`SELECT ${selectSql(this.selection)} FROM ${table(this.tableName)} t${where}${order ? ` ORDER BY ${order}` : ""}${paging}`, params);
    let rows = rowsResult.rows as Record<string, unknown>[];
    for (const relation of this.selection.relations) {
      const relationRows = await loadRelation(client, this.tableName, rows, relation, this.filters);
      rows = rows.filter((row) => matchesInner(row, relation, relationRows.get(String(row[relationFor(this.tableName, relation.table)?.parentKey || "id"]))));
      for (const row of rows) {
        const mapping = relationFor(this.tableName, relation.table);
        const related = relationRows.get(String(row[mapping?.parentKey || "id"]));
        row[relation.key] = related ?? (mapping?.many ? [] : null);
      }
    }
    if (this.options.count) {
      const countParams: unknown[] = [];
      const countWhere = this.baseWhere(countParams);
      const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM ${table(this.tableName)} t${countWhere}`, countParams);
      return this.finishCardinality(rows, Number(countResult.rows[0]?.count || 0));
    }
    return this.finishCardinality(rows, null);
  }

  private async executeMutation(client: Client): Promise<QueryResponse> {
    const params: unknown[] = [];
    const where = this.baseWhere(params);
    let sql = "";
    if (this.mode === "insert" || this.mode === "upsert") {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
      const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
      if (!columns.length) throw new Error("Database insert has no columns.");
      const values = records.map((record) => `(${columns.map((column) => { params.push((record as Record<string, unknown>)[column] ?? null); return `$${params.length}`; }).join(", ")})`).join(", ");
      sql = `INSERT INTO ${table(this.tableName)} (${columns.map(quoteIdentifier).join(", ")}) VALUES ${values}`;
      if (this.mode === "upsert") {
        if (!this.conflictColumns.length) throw new Error("Upsert requires onConflict columns.");
        const updates = columns.filter((column) => !this.conflictColumns.includes(column)).map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`);
        sql += ` ON CONFLICT (${this.conflictColumns.map(quoteIdentifier).join(", ")}) ${updates.length ? `DO UPDATE SET ${updates.join(", ")}` : "DO NOTHING"}`;
      }
    } else if (this.mode === "update") {
      const values = this.payload as Record<string, unknown>;
      const columns = Object.keys(values);
      if (!columns.length) throw new Error("Database update has no columns.");
      sql = `UPDATE ${table(this.tableName)} SET ${columns.map((column) => { params.push(values[column]); return `${quoteIdentifier(column)} = $${params.length}`; }).join(", ")}${where}`;
    } else {
      sql = `DELETE FROM ${table(this.tableName)}${where}`;
    }
    if (this.selectionRequested) sql += ` RETURNING ${selectSql(this.selection)}`;
    const result = await client.query(sql, params);
    const rows = result.rows as Record<string, unknown>[];
    if (this.options.count) return { data: this.cardinality === "many" ? rows : rows[0] || null, count: result.rowCount || 0, error: null };
    return this.finishCardinality(rows, null);
  }

  private finishCardinality(rows: Record<string, unknown>[], count: number | null): QueryResponse {
    if (this.cardinality === "single") {
      if (rows.length !== 1) return { data: null, count, error: { message: `Expected exactly one row, got ${rows.length}.`, code: "PGRST116" } };
      return { data: rows[0], count, error: null };
    }
    if (this.cardinality === "maybeSingle") {
      if (rows.length > 1) return { data: null, count, error: { message: `Expected zero or one row, got ${rows.length}.`, code: "PGRST116" } };
      return { data: rows[0] || null, count, error: null };
    }
    return { data: rows, count, error: null };
  }
}

export function createPostgresClient(connectionString: string) {
  return {
    from(name: string) { return new PostgresQuery(connectionString, name); },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return new RpcQuery(connectionString, name, args);
    },
  };
}

class RpcQuery implements PromiseLike<QueryResponse> {
  private cardinality: "many" | "single" | "maybeSingle" = "many";
  constructor(private readonly connectionString: string, private readonly functionName: string, private readonly args: Record<string, unknown>) {
    if (!TABLE_NAME.test(functionName)) throw new Error(`Unsafe database function: ${functionName}`);
  }
  select(): this { return this; }
  single(): this { this.cardinality = "single"; return this; }
  maybeSingle(): this { this.cardinality = "maybeSingle"; return this; }
  then<TResult1 = QueryResponse, TResult2 = never>(onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled || undefined, onrejected || undefined);
  }
  private async execute(): Promise<QueryResponse> {
    const client = new Client({ connectionString: this.connectionString });
    try {
      await client.connect();
      const keys = Object.keys(this.args);
      const params = keys.map((key) => this.args[key]);
      const named = keys.map((key, index) => `${quoteIdentifier(key)} => $${index + 1}`).join(", ");
      const result = await client.query(`SELECT * FROM public.${quoteIdentifier(this.functionName)}(${named})`, params);
      const rows = result.rows as Record<string, unknown>[];
      if (this.cardinality === "single") {
        if (rows.length !== 1) return { data: null, error: { message: `Expected exactly one RPC row, got ${rows.length}.`, code: "PGRST116" } };
        return { data: rows[0], error: null };
      }
      if (this.cardinality === "maybeSingle") {
        if (rows.length > 1) return { data: null, error: { message: `Expected zero or one RPC row, got ${rows.length}.`, code: "PGRST116" } };
        return { data: rows[0] || null, error: null };
      }
      if (rows.length === 1 && Object.keys(rows[0] || {}).length === 1 && Object.prototype.hasOwnProperty.call(rows[0], this.functionName)) return { data: rows[0][this.functionName], error: null };
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
