import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  BulkProductRowSchema,
  BULK_IMPORT_MAX_ROWS,
  type BulkProductRow,
} from "./schema.js";

export type ParsedFileResult = {
  rows: Record<string, unknown>[];
  format: "csv" | "xlsx";
  totalRows: number;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeHeader(header: string): string {
  return header.trim();
}

function coerceRowValues(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    if (value === null || value === undefined) {
      out[normalizedKey] = value;
    } else if (typeof value === "string") {
      out[normalizedKey] = value.trim();
    } else {
      out[normalizedKey] = value;
    }
  }
  return out;
}

export function parseCsv(buffer: Buffer): ParsedFileResult {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => normalizeHeader(h),
  });

  if (result.errors.length > 0) {
    const firstError = result.errors[0]!;
    throw new Error(
      `CSV parse error on row ${firstError.row ?? "?"}: ${firstError.message}`,
    );
  }

  const rows = result.data.map(coerceRowValues);
  return {
    rows,
    format: "csv",
    totalRows: rows.length,
  };
}

export function parseXlsx(buffer: Buffer): ParsedFileResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("XLSX file contains no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName]!;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows = rawRows.map(coerceRowValues);
  return {
    rows,
    format: "xlsx",
    totalRows: rows.length,
  };
}

export function parseImportFile(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): ParsedFileResult {
  const lowerName = filename.toLowerCase();
  const isXlsx =
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    mimetype.includes("spreadsheetml") ||
    mimetype.includes("vnd.ms-excel");

  if (isXlsx) {
    return parseXlsx(buffer);
  }
  return parseCsv(buffer);
}

export type ValidationResult =
  | { ok: true; data: BulkProductRow; rowNumber: number }
  | { ok: false; errors: string[]; rowNumber: number; data: Record<string, unknown> };

export function validateRow(
  row: Record<string, unknown> | undefined,
  rowNumber: number,
): ValidationResult {
  const safeRow: Record<string, unknown> = row ?? {};
  const result = BulkProductRowSchema.safeParse(safeRow);
  if (result.success) {
    return { ok: true, data: result.data, rowNumber };
  }

  const errors = result.error.errors.map(
    (e) => `${e.path.join(".") || "row"}: ${e.message}`,
  );
  return { ok: false, errors, rowNumber, data: safeRow };
}

export function assertRowCount(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    throw new Error("File contains no data rows");
  }
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(
      `File contains ${rows.length} rows; maximum allowed is ${BULK_IMPORT_MAX_ROWS}`,
    );
  }
}

export const REQUIRED_COLUMNS = [
  "name",
  "description",
  "price",
  "costPrice",
  "categoryId",
  "brandId",
] as const;

export function checkHeaders(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const firstRow = rows[0]!;
  const headers = Object.keys(firstRow);
  const missing = REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col) && !headers.includes(col.toLowerCase()),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.join(", ")}. Required: ${REQUIRED_COLUMNS.join(", ")}`,
    );
  }
}

export { UUID_REGEX };
