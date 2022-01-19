import test from 'ava'
import {Kind, lex} from './lex'
import {Varname} from './variables'

let cases: [string, { kind: Kind, value: string }[], Varname[]?][] = [
  [
    'Income 128000 usd / 13 - 25%',
    [
      {kind: 'word', value: 'Income'},
      {kind: 'number', value: '128000'},
      {kind: 'word', value: 'usd'},
      {kind: 'operator', value: '/'},
      {kind: 'number', value: '13'},
      {kind: 'operator', value: '-'},
      {kind: 'percentage', value: '25%'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '(2)',
    [
      {kind: 'bracket', value: '('},
      {kind: 'number', value: '2'},
      {kind: 'bracket', value: ')'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '5%',
    [
      {kind: 'percentage', value: '5%'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    'ƒы1',
    [
      {kind: 'variable', value: 'ƒы1'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '⟦1,⟧',
    [
      {kind: 'reference', value: '⟦1,⟧'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '1^2',
    [
      {kind: 'number', value: '1'},
      {kind: 'operator', value: '^'},
      {kind: 'number', value: '2'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '$1',
    [
      {kind: 'word', value: '$'},
      {kind: 'number', value: '1'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '(1 usd in rub)',
    [
      {kind: 'bracket', value: '('},
      {kind: 'number', value: '1'},
      {kind: 'word', value: 'usd'},
      {kind: 'operator', value: 'in'},
      {kind: 'word', value: 'rub'},
      {kind: 'bracket', value: ')'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    'm100',
    [
      {kind: 'word', value: 'm'},
      {kind: 'number', value: '100'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '.5',
    [
      {kind: 'number', value: '.5'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '.',
    [
      {kind: 'word', value: '.'},
      {kind: 'eof', value: ''},
    ]
  ],
  [
    '  var  = 1',
    [
      {kind: 'variable', value: 'var',},
      {kind: 'operator', value: '=',},
      {kind: 'number', value: '1',},
      {kind: 'eof', value: '',},
    ],
    ['val' as Varname]
  ],
  [
    'var 1= 1',
    [
      {kind: 'variable', value: 'var 1',},
      {kind: 'operator', value: '=',},
      {kind: 'number', value: '1',},
      {kind: 'eof', value: '',},
    ],
    ['val 1' as Varname]
  ],
  [
    'a b + a b c',
    [
      {kind: 'variable', value: 'a b',},
      {kind: 'operator', value: '+',},
      {kind: 'variable', value: 'a b c',},
      {kind: 'eof', value: '',},
    ],
    ['a b' as Varname, 'a b c' as Varname],
  ],
  [
    'iphone 8',
    [
      {kind: 'variable', value: 'iphone 8',},
      {kind: 'eof', value: '',},
    ],
    ['iphone 8' as Varname],
  ],
]

for (let [expr, tokens, vars = []] of cases) {
  test('lex ' + expr, t => {
    t.is(echo(lex(expr, vars)), echo(tokens))
  })
}

function echo(tokens: { kind: Kind, value: string }[]) {
  let output = ''
  for (let t of tokens) {
    output += `${t.kind}: ${t.value}\n`
  }
  return output
}
