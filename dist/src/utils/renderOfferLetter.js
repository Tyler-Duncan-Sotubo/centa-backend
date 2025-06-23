"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderOfferLetter = renderOfferLetter;
exports.wrapInHtml = wrapInHtml;
const handlebars_1 = require("handlebars");
function renderOfferLetter(template, data) {
    const compiled = handlebars_1.default.compile(template);
    return compiled(data);
}
function wrapInHtml(content) {
    return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: 'Helvetica', sans-serif;
          font-size: 12pt;
          padding: 30px;
          line-height: 1.6;
          color: #000;
        }

        h1, h2, h3 {
          margin-top: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }

        .signature {
          margin-top: 50px;
        }

        hr {
          margin: 40px 0;
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
  </html>
  `;
}
//# sourceMappingURL=renderOfferLetter.js.map