import { useState } from 'react'

interface UsePaginationProps {
  initialPage?: number
  initialLimit?: number
}

export function usePagination({ initialPage = 1, initialLimit = 20 }: UsePaginationProps = {}) {
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when limit changes
  }

  const reset = () => {
    setPage(initialPage)
    setLimit(initialLimit)
  }

  return {
    page,
    limit,
    setPage: handlePageChange,
    setLimit: handleLimitChange,
    reset,
  }
}
