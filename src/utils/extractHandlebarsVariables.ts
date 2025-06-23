import Handlebars from 'handlebars';

export function extractHandlebarsVariables(template: string): string[] {
  const ast = Handlebars.parse(template);
  const vars = new Set<string>();

  function traverse(node: any) {
    if (!node) return;

    if (node.type === 'MustacheStatement' || node.type === 'SubExpression') {
      if (node.path?.original) {
        vars.add(node.path.original);
      }
    }

    const keys = Object.keys(node);
    for (const key of keys) {
      const val = node[key];
      if (Array.isArray(val)) {
        val.forEach(traverse);
      } else if (typeof val === 'object' && val !== null) {
        traverse(val);
      }
    }
  }

  traverse(ast);
  return Array.from(vars);
}
