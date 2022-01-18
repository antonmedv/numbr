import test from 'ava'
import * as Results from './results'

let rs = Object.entries(Results)
for (let [name, Result] of rs) {
  test(`result "${name}" have a "kind"`, t => {
    let node = new (Result as any)
    t.is(typeof node.kind, 'string')
  })
}
