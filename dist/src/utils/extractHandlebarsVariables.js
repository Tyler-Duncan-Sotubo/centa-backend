"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractHandlebarsVariables = extractHandlebarsVariables;
const handlebars_1 = require("handlebars");
function extractHandlebarsVariables(template) {
    const ast = handlebars_1.default.parse(template);
    const vars = new Set();
    function traverse(node) {
        if (!node)
            return;
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
            }
            else if (typeof val === 'object' && val !== null) {
                traverse(val);
            }
        }
    }
    traverse(ast);
    return Array.from(vars);
}
//# sourceMappingURL=extractHandlebarsVariables.js.map