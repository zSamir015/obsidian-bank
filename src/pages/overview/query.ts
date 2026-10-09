/** The subset of a React Query result the overview sections need. */
export interface QueryView<T> {
  readonly data: T | undefined
  readonly isPending: boolean
  readonly isError: boolean
  readonly refetch: () => unknown
}
