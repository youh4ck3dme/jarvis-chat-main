export const TRUNCATED_HTML = `\`\`\`html
<!DOCTYPE html>
<html>
<head><style>body { margin: 0; }</style></head>
<body>
  <section id="hero"><button>Start</button></section>
`

export const COMPLETE_HTML = `\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; }
    button { min-height: 48px; padding: 12px 20px; }
    @media (max-width: 768px) { body { padding: 16px; } }
  </style>
</head>
<body>
  <section id="hero"><button>Start</button></section>
  <section id="about"><p>About</p></section>
  <script>document.querySelector("button")?.addEventListener("click", () => {});</script>
</body>
</html>
\`\`\``

export const NO_SCRIPT_HTML = `\`\`\`html
<!DOCTYPE html>
<html>
<head><style>body { margin: 0; }</style></head>
<body>
  <section id="hero"><button>Start</button></section>
  <section id="about"><p>About</p></section>
</body>
</html>
\`\`\``