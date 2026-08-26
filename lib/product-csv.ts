export type CsvRow = Record<string, string>

/** Small RFC 4180-style parser: quoted commas, quotes and line breaks are supported. */
export function parseProductCsv(text: string): CsvRow[] {
  const table: string[][] = [['']]
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        const row = table[table.length - 1]
        row[row.length - 1] += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      table.at(-1)!.push('')
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      table.push([''])
    } else {
      table[table.length - 1][table.at(-1)!.length - 1] += character
    }
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted value.')

  const populated = table.filter((row) => row.some((cell) => cell.trim()))
  if (populated.length < 2) throw new Error('The CSV needs a header and at least one product row.')
  const headers = populated[0].map((cell) => cell.replace(/^\uFEFF/, '').trim().toLowerCase())
  if (!headers.includes('name')) throw new Error('The CSV needs a name column.')
  if (new Set(headers).size !== headers.length) throw new Error('CSV column names must be unique.')
  if (populated.length > 101) throw new Error('Import no more than 100 products at a time.')

  return populated.slice(1).map((cells) => Object.fromEntries(
    headers.map((header, index) => [header, cells[index]?.trim() ?? '']),
  ))
}
