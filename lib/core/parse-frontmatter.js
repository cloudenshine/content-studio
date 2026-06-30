/**
 * Minimal YAML frontmatter parser for Content Studio assets.
 *
 * Supports the subset used by SKILL.md and DESIGN.md:
 * nested mappings, scalar arrays, arrays of objects, inline arrays,
 * strings, booleans, nulls, and numbers. It intentionally does not
 * implement anchors, tags, multiline scalars, or other full YAML features.
 */

function indentation(line) {
  const match = line.match(/^\s*/);
  return match ? match[0].length : 0;
}

function splitKeyValue(text) {
  const colon = text.indexOf(":");
  if (colon < 1) return null;
  return [text.slice(0, colon).trim(), text.slice(colon + 1).trim()];
}

function splitInlineArray(text) {
  const values = [];
  let current = "";
  let quote = "";
  for (const char of text) {
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? "" : char;
      current += char;
    } else if (char === "," && !quote) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "") return null;
  if (value === "[]") return [];
  if (value === "{}") return {};
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner ? splitInlineArray(inner).map(parseScalar) : [];
  }
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?(?:\d+\.\d*|\d*\.\d+)$/.test(value)) return Number.parseFloat(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseLines(lines) {
  const records = lines
    .map(line => ({ raw: line, indent: indentation(line), text: line.trim() }))
    .filter(record => record.text && !record.text.startsWith("#"));

  function parseMap(start, baseIndent) {
    const result = {};
    let index = start;
    while (index < records.length) {
      const record = records[index];
      if (record.indent < baseIndent) break;
      if (record.indent > baseIndent || record.text.startsWith("- ")) break;
      const pair = splitKeyValue(record.text);
      if (!pair) {
        index++;
        continue;
      }
      const [key, rawValue] = pair;
      if (rawValue !== "") {
        result[key] = parseScalar(rawValue);
        index++;
        continue;
      }

      const next = records[index + 1];
      if (!next || next.indent <= baseIndent) {
        result[key] = null;
        index++;
        continue;
      }
      const parsed = next.text.startsWith("- ")
        ? parseSequence(index + 1, next.indent)
        : parseMap(index + 1, next.indent);
      result[key] = parsed.value;
      index = parsed.next;
    }
    return { value: result, next: index };
  }

  function parseSequence(start, baseIndent) {
    const result = [];
    let index = start;
    while (index < records.length) {
      const record = records[index];
      if (record.indent < baseIndent) break;
      if (record.indent !== baseIndent || !record.text.startsWith("- ")) break;
      const itemText = record.text.slice(2).trim();
      const pair = splitKeyValue(itemText);

      if (!pair) {
        result.push(parseScalar(itemText));
        index++;
        continue;
      }

      const [key, rawValue] = pair;
      const item = { [key]: rawValue === "" ? null : parseScalar(rawValue) };
      index++;

      if (rawValue === "" && index < records.length && records[index].indent > baseIndent) {
        const child = records[index].text.startsWith("- ")
          ? parseSequence(index, records[index].indent)
          : parseMap(index, records[index].indent);
        item[key] = child.value;
        index = child.next;
      }

      if (index < records.length && records[index].indent > baseIndent) {
        const continuation = parseMap(index, records[index].indent);
        Object.assign(item, continuation.value);
        index = continuation.next;
      }
      result.push(item);
    }
    return { value: result, next: index };
  }

  if (records.length === 0) return {};
  return parseMap(0, records[0].indent).value;
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = parseLines(match[1].split(/\r?\n/));
  return { meta, body: text.slice(match[0].length).trimStart() };
}
