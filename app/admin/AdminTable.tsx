"use client";
import { useState } from "react";
export default function AdminTable({ columns, rows }: { columns: string[]; rows: Record<string, string | number | null>[] }) {
  const [sort, setSort] = useState<{ key: string; ascending: boolean } | null>(null);
  const sorted = sort ? [...rows].sort((a, b) => {
    const left = a[sort.key] ?? ""; const right = b[sort.key] ?? "";
    const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return sort.ascending ? result : -result;
  }) : rows;
  return <div className="adminTableWrap"><table className="adminTable"><caption>Recorded data · sorting applies to the current page</caption><thead><tr>{columns.map(column => <th key={column} scope="col" aria-sort={sort?.key === column ? sort.ascending ? "ascending" : "descending" : "none"}><button onClick={() => setSort({ key: column, ascending: sort?.key === column ? !sort.ascending : true })}>{column.replaceAll("_", " ")}{sort?.key === column ? sort.ascending ? " ↑" : " ↓" : " ↕"}</button></th>)}</tr></thead><tbody>{sorted.map((row, index) => <tr key={String(row.id || row.dimension || row.session || index)}>{columns.map(column => <td key={column}><span className={column === "status" ? "adminStatus" : undefined}>{String(row[column] ?? "—")}</span></td>)}</tr>)}</tbody></table></div>;
}
