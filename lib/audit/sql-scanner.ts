import type { SqlStatement } from "@/lib/audit/types";

export function splitSqlStatements(sql: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let buffer = "";
  let line = 1;
  let statementLine = 1;
  let hasContent = false;
  let mode:
    | "normal"
    | "single"
    | "double"
    | "line-comment"
    | "block-comment"
    | "dollar" = "normal";
  let blockDepth = 0;
  let dollarTag = "";

  const beginContent = (character: string) => {
    if (!hasContent && !/\s/.test(character)) {
      statementLine = line;
      hasContent = true;
    }
  };

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1] ?? "";
    beginContent(character);
    buffer += character;

    if (mode === "line-comment") {
      if (character === "\n") mode = "normal";
    } else if (mode === "block-comment") {
      if (character === "/" && next === "*") {
        buffer += next;
        index += 1;
        blockDepth += 1;
      } else if (character === "*" && next === "/") {
        buffer += next;
        index += 1;
        blockDepth -= 1;
        if (blockDepth === 0) mode = "normal";
      }
    } else if (mode === "single") {
      if (character === "'" && next === "'") {
        buffer += next;
        index += 1;
      } else if (character === "'") {
        mode = "normal";
      }
    } else if (mode === "double") {
      if (character === '"' && next === '"') {
        buffer += next;
        index += 1;
      } else if (character === '"') {
        mode = "normal";
      }
    } else if (mode === "dollar") {
      if (sql.startsWith(dollarTag, index)) {
        buffer += dollarTag.slice(1);
        index += dollarTag.length - 1;
        mode = "normal";
      }
    } else if (character === "-" && next === "-") {
      buffer += next;
      index += 1;
      mode = "line-comment";
    } else if (character === "/" && next === "*") {
      buffer += next;
      index += 1;
      mode = "block-comment";
      blockDepth = 1;
    } else if (character === "'") {
      mode = "single";
    } else if (character === '"') {
      mode = "double";
    } else if (character === "$") {
      const tag = sql.slice(index).match(/^\$[a-z_][a-z0-9_]*\$|^\$\$/i)?.[0];
      if (tag) {
        buffer += tag.slice(1);
        index += tag.length - 1;
        dollarTag = tag;
        mode = "dollar";
      }
    } else if (character === ";") {
      if (buffer.trim())
        statements.push({ text: buffer.trim(), line: statementLine });
      buffer = "";
      hasContent = false;
      statementLine = line;
    }

    const added = buffer.endsWith("\n") ? 1 : 0;
    line += added;
  }

  if (buffer.trim())
    statements.push({ text: buffer.trim(), line: statementLine });
  return statements;
}

export function maskCommentsAndLiterals(sql: string): string {
  let masked = "";
  let mode: "normal" | "single" | "line-comment" | "block-comment" | "dollar" =
    "normal";
  let blockDepth = 0;
  let dollarTag = "";

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1] ?? "";
    const blank = character === "\n" ? "\n" : " ";

    if (mode === "line-comment") {
      masked += blank;
      if (character === "\n") mode = "normal";
    } else if (mode === "block-comment") {
      masked += blank;
      if (character === "/" && next === "*") {
        masked += " ";
        index += 1;
        blockDepth += 1;
      } else if (character === "*" && next === "/") {
        masked += " ";
        index += 1;
        blockDepth -= 1;
        if (blockDepth === 0) mode = "normal";
      }
    } else if (mode === "single") {
      masked += blank;
      if (character === "'" && next === "'") {
        masked += " ";
        index += 1;
      } else if (character === "'") {
        mode = "normal";
      }
    } else if (mode === "dollar") {
      masked += blank;
      if (sql.startsWith(dollarTag, index)) {
        masked += " ".repeat(dollarTag.length - 1);
        index += dollarTag.length - 1;
        mode = "normal";
      }
    } else if (character === "-" && next === "-") {
      masked += "  ";
      index += 1;
      mode = "line-comment";
    } else if (character === "/" && next === "*") {
      masked += "  ";
      index += 1;
      mode = "block-comment";
      blockDepth = 1;
    } else if (character === "'") {
      masked += " ";
      mode = "single";
    } else if (character === "$") {
      const tag = sql.slice(index).match(/^\$[a-z_][a-z0-9_]*\$|^\$\$/i)?.[0];
      if (tag) {
        masked += " ".repeat(tag.length);
        index += tag.length - 1;
        dollarTag = tag;
        mode = "dollar";
      } else {
        masked += character;
      }
    } else {
      masked += character;
    }
  }

  return masked;
}
