// 首尾各保留三页，中间始终只使用一个可跳转的省略号。
export function paginationItems(total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  return [1, 2, 3, "ellipsis", total - 2, total - 1, total]
}
