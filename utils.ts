import {Markup} from './nodes'

export function mergeMarkup(markup: Markup | undefined) {
  let map = new Map<number, [number, string, string?][]>()
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
