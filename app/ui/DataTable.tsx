import type { ReactNode } from "react";
import styles from "./system.module.css";

export type DataTableColumn<Row> = { key: string; header: ReactNode; cell: (row: Row) => ReactNode };
export default function DataTable<Row>({ columns, rows, getRowKey, caption }: { columns: DataTableColumn<Row>[]; rows: Row[]; getRowKey: (row: Row) => string; caption: string }) {
  return <div className={styles.tableWrap}><table className={styles.table}><caption className="srOnly">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={getRowKey(row)}>{columns.map((column) => <td key={column.key}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div>;
}
