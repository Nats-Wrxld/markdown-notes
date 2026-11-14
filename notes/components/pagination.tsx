import Link from "next/link";

type PaginationProps = {
  page: number;
  pageCount: number;
  basePath: string;
  params?: Record<string, string>;
};

function pageHref(basePath: string, params: Record<string, string>, page: number): string {
  const search = new URLSearchParams({ ...params, page: String(page) });
  return `${basePath}?${search.toString()}`;
}

export default function Pagination({ page, pageCount, basePath, params = {} }: PaginationProps) {
  if (pageCount <= 1) return null;

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== ""),
  );
  const current = Math.min(Math.max(1, page), pageCount);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
      {current > 1 ? (
        <Link
          href={pageHref(basePath, cleanParams, current - 1)}
          className="ui-button ui-button-secondary min-h-0 px-4 py-2 text-xs"
        >
          ← Previous
        </Link>
      ) : (
        <span aria-disabled="true" className="ui-button ui-button-secondary min-h-0 cursor-not-allowed px-4 py-2 text-xs opacity-50">
          ← Previous
        </span>
      )}
      <span className="ui-text-muted text-xs font-medium">
        Page {current} of {pageCount}
      </span>
      {current < pageCount ? (
        <Link
          href={pageHref(basePath, cleanParams, current + 1)}
          className="ui-button ui-button-secondary min-h-0 px-4 py-2 text-xs"
        >
          Next →
        </Link>
      ) : (
        <span aria-disabled="true" className="ui-button ui-button-secondary min-h-0 cursor-not-allowed px-4 py-2 text-xs opacity-50">
          Next →
        </span>
      )}
    </nav>
  );
}