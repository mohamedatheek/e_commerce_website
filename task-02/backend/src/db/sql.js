function splitSqlStatements(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((part) =>
      part
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter(Boolean);
}

module.exports = { splitSqlStatements };
