import {Assignment, Node} from '../nodes'
import {Token} from './lex'

export type Varname = string & { kind: 'varname' }

export function tokenToVariableName(t: Token): Varname {
  return t.value.toLowerCase() as Varname
}

export function updateVars(vars: Varname[], node: Node) {
  if (node instanceof Assignment) {
    vars.push(tokenToVariableName(node.variable))
  }
}

export function findVars(code: string, vars: Varname[]) {
  let map = new Map<number, number>()
  if (vars.length == 0) return map
  vars.sort((a, b) => b.length - a.length)
  let regex = new RegExp(vars.join('|'), 'ig')
  let matches = code.matchAll(regex)
  for (let m of matches) {
    if (m.index != undefined) map.set(m.index, m.index + m[0].length)
  }
  return map
}
