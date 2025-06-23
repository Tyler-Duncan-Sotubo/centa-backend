import Handlebars from 'handlebars';

export function renderOfferLetter(template: string, data: Record<string, any>) {
  const compiled = Handlebars.compile(template);
  return compiled(data);
}

export function wrapInHtml(content: string) {
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
