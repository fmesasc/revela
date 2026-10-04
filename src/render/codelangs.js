// Languages highlight.js's common bundle lacks and Revela's users write (Power BI, Excel):
// DAX, Power Query M and worksheet formulas. Small grammars — keywords, functions,
// table[column] references, strings, numbers, comments — registered once on the hljs given.
// Self-contained (no outside names): the exported presentation embeds this function as
// text (io/formats/html.js) to teach reveal.js's own highlight.js the same languages.

export function registerCodeLangs(hljs) {
  if (!hljs || hljs.__revelaLangs) return hljs;
  const FUNC = { className: 'title.function', begin: /\b[A-Za-z_][\w.]*(?=\s*\()/ };
  const NUM = { className: 'number', begin: /\b\d+(\.\d+)?([eE][-+]?\d+)?%?/ };
  const COMMENTS = [{ className: 'comment', begin: '//', end: '$' }, { className: 'comment', begin: '--', end: '$' }, { className: 'comment', begin: /\/\*/, end: /\*\// }];

  const dax = () => ({
    name: 'DAX', case_insensitive: true,
    keywords: { keyword: 'VAR RETURN DEFINE EVALUATE MEASURE ORDER BY ASC DESC IN NOT AND OR TRUE FALSE BLANK', literal: 'TRUE FALSE' },
    contains: [...COMMENTS,
      { className: 'string', begin: '"', end: '"', contains: [{ begin: '""' }] },
      { className: 'variable', begin: /'[^']+'(?=\[)|\b[\wÀ-ɏ]+(?=\[)/ },          // table before [column]
      { className: 'attr', begin: /\[/, end: /\]/ },                                            // [column] / [measure]
      FUNC, NUM, { className: 'operator', begin: /&&|\|\||<>|>=|<=|[=+\-*/&^<>]/ }],
  });
  const powerquery = () => ({
    name: 'Power Query M', aliases: ['m', 'pq'],
    keywords: { keyword: 'let in if then else each try otherwise error and or not as is meta section shared type', literal: 'true false null', built_in: '#table #date #datetime #duration #time #shared' },
    contains: [{ className: 'comment', begin: '//', end: '$' }, { className: 'comment', begin: /\/\*/, end: /\*\// },
      { className: 'string', begin: '"', end: '"', contains: [{ begin: '""' }] },
      { className: 'variable', begin: /#"/, end: '"' },                                        // #"Quoted name"
      { className: 'attr', begin: /\[/, end: /\]/ },
      FUNC, NUM, { className: 'operator', begin: /=>|<>|>=|<=|[=+\-*/&<>]/ }],
  });
  const excel = () => ({
    name: 'Excel', aliases: ['xlsx', 'xls', 'formula'], case_insensitive: true,
    keywords: { literal: 'TRUE FALSE' },
    contains: [{ className: 'string', begin: '"', end: '"', contains: [{ begin: '""' }] },
      { className: 'variable', begin: /(\b[\w.]+!|'[^']+'!)?\$?[A-Z]{1,3}\$?\d+(:\$?[A-Z]{1,3}\$?\d+)?/ },
      { className: 'attr', begin: /\[/, end: /\]/ },
      FUNC, NUM, { className: 'operator', begin: /<>|>=|<=|[=+\-*/&^<>%]/ }],
  });
  for (const [name, def] of [['dax', dax], ['powerquery', powerquery], ['excel', excel]]) if (!hljs.getLanguage(name)) hljs.registerLanguage(name, def);
  hljs.__revelaLangs = true;
  return hljs;
}
