export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-foreground">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines[0]?.startsWith("### ")) {
          return (
            <div key={i}>
              <h3 className="mb-1 text-sm font-medium">{lines[0].slice(4)}</h3>
              {lines.slice(1).map((l, j) => (
                <p key={j} className="text-muted">
                  {inline(l)}
                </p>
              ))}
            </div>
          );
        }
        if (lines[0]?.startsWith("## ") || lines[0]?.startsWith("# ")) {
          const t = lines[0].replace(/^#+ /, "");
          return (
            <div key={i}>
              <h2 className="mb-1 font-display text-lg font-medium tracking-tight">
                {t}
              </h2>
              {lines.slice(1).map((l, j) => (
                <p key={j} className="text-muted">
                  {inline(l)}
                </p>
              ))}
            </div>
          );
        }
        return (
          <p key={i} className="text-foreground">
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string) {
  const parts = s.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-sm bg-elevated px-1 py-0.5 font-mono text-[12px]"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-medium">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
