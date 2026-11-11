import { parse } from "acorn";
export function parseTcnoBundle(text) {
  if (Buffer.byteLength(text) > 2_000_000)
    throw Error("Provider bundle exceeds limit");
  const ast = parse(text, { ecmaVersion: "latest", sourceType: "module" });
  let work = 0;
  const literal = (node, depth = 0) => {
    if (!node || ++work > 50000 || depth > 30)
      throw Error("Provider literal limit");
    if (node.type === "Literal" && !node.regex && !node.bigint)
      return node.value;
    if (node.type === "TemplateLiteral" && !node.expressions.length)
      return node.quasis[0].value.cooked;
    if (node.type === "ArrayExpression")
      return node.elements.map((n) => literal(n, depth + 1));
    if (node.type === "ObjectExpression") {
      const result = Object.create(null);
      for (const p of node.properties) {
        if (
          p.type !== "Property" ||
          p.computed ||
          p.method ||
          p.kind !== "init"
        )
          throw Error("Nonliteral provider property");
        const key = p.key.name ?? p.key.value;
        if (
          ["__proto__", "constructor", "prototype"].includes(key) ||
          Object.hasOwn(result, key)
        )
          throw Error("Unsafe provider key");
        result[key] = literal(p.value, depth + 1);
      }
      return result;
    }
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      !node.callee.computed &&
      node.callee.object.name === "JSON" &&
      node.callee.property.name === "parse" &&
      node.arguments.length === 1
    )
      return JSON.parse(literal(node.arguments[0], depth + 1));
    throw Error("Executable provider data rejected: " + node.type);
  };
  for (const n of ast.body)
    if (n.type === "VariableDeclaration")
      for (const d of n.declarations) {
        if (d.init?.type !== "ObjectExpression") continue;
        const keys = d.init.properties.map((p) => p.key?.name ?? p.key?.value);
        if (["items", "unlocks", "fobUpgrades"].every((k) => keys.includes(k)))
          return literal(d.init);
      }
  throw Error("Provider dataset not found");
}
