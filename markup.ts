export type Tag = 'number'
  | 'variable'
  | 'operator'
  | 'currency'
  | 'exp'
  | 'warning'
  | 'none'

export type Markup = [number, number, Tag, string?][]

export function mergeMarkup(markup: Markup | undefined) {
  let map = new Map<number, [number, Tag, string?][]>()
  if (markup == undefined) {
    return map
  }
  for (let [start, end, className, title] of markup) {
    let list = map.get(start)
    if (!list) {
      list = []
    }
    list.push([end, className, title])
    map.set(start, list)
  }
  return map
}
