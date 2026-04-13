import { useMemo, useState } from "react";

export function useDocumentPagination({ documents, sortBy, sortOrder, initialPageSize = 10 }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = initialPageSize;

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "createdAt" || sortBy === "updatedAt") {
        aVal = new Date(a[sortBy]);
        bVal = new Date(b[sortBy]);
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [documents, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedDocuments.length / pageSize);

  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDocuments.slice(start, start + pageSize);
  }, [sortedDocuments, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    sortedDocuments,
    totalPages,
    paginatedDocuments,
  };
}
