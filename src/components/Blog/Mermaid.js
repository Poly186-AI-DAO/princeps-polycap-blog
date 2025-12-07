"use client";

import { useEffect, useRef, useState } from "react";

const Mermaid = ({ chart }) => {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let isMounted = true;

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "default",
          securityLevel: "loose",
        });
        const { svg } = await mermaid.render(idRef.current, chart);
        if (isMounted) {
          setSvg(svg);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to render diagram");
          setSvg("");
          console.error("Mermaid render failed", err);
        }
      }
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <pre className="p-4 rounded-lg bg-dark/80 text-red-200 overflow-auto">
        {chart}
      </pre>
    );
  }

  return (
    <div
      className="mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-label="Mermaid diagram"
    />
  );
};

export default Mermaid;
