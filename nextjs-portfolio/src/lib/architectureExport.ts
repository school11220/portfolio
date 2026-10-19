type ExportDetails = {
  project: string;
  title: string;
  flow: string;
  description: string;
  repository: string;
  revision: string;
  note: string;
  step: number | null;
  steps: string[];
  sources: string[];
  width: number;
  height: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";

// Resolve the displayed SVG's CSS so the downloaded vector has no app/font dependency.
export function exportArchitectureSvg(svg: SVGSVGElement, details: ExportDetails) {
  const diagram = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll("*")];
  const copies = [diagram, ...diagram.querySelectorAll("*")];
  const properties = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-weight", "text-anchor", "paint-order"];
  originals.forEach((element, index) => {
    const copy = copies[index];
    const computed = getComputedStyle(element);
    copy.removeAttribute("style");
    copy.removeAttribute("class");
    copy.removeAttribute("tabindex");
    copy.removeAttribute("role");
    copy.removeAttribute("aria-pressed");
    const resolved = properties.map((property) => `${property}:${computed.getPropertyValue(property)}`).join(";");
    copy.setAttribute("style", `${resolved};font-family:monospace`);
  });
  diagram.setAttribute("width", String(details.width));
  diagram.setAttribute("height", String(details.height));
  diagram.removeAttribute("aria-label");

  const output = document.createElementNS(SVG_NS, "svg");
  const width = details.width + 64;
  output.setAttribute("width", String(width));
  output.setAttribute("role", "img");
  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = `${details.project} — ${details.flow}`;
  output.appendChild(title);
  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#050b07");
  output.appendChild(background);

  let y = 34;
  const addText = (text: string, size: number, color: string, maxChars = 112) => {
    const lines: string[] = [];
    for (const word of text.split(/\s+/)) {
      if (lines.length && `${lines[lines.length - 1]} ${word}`.length <= maxChars) lines[lines.length - 1] += ` ${word}`;
      else lines.push(word);
    }
    for (const line of lines) {
      const element = document.createElementNS(SVG_NS, "text");
      element.setAttribute("x", "32");
      element.setAttribute("y", String(y));
      element.setAttribute("font-family", "monospace");
      element.setAttribute("font-size", String(size));
      element.setAttribute("fill", color);
      element.textContent = line;
      output.appendChild(element);
      y += size * 1.55;
    }
    y += 7;
  };
  addText(details.project, 16, "#8de0ad", 90);
  addText(`${details.title} / ${details.flow}`, 18, "#eafff1", 88);
  addText(details.description, 12, "#afc4b4");
  addText(details.step === null ? "Full flow overview" : `Walkthrough step ${details.step + 1} of ${details.steps.length}`, 11, "#ffd27c");
  diagram.setAttribute("x", "32");
  diagram.setAttribute("y", String(y));
  output.appendChild(diagram);
  y += details.height + 25;
  addText("FLOW STEPS", 12, "#8de0ad");
  details.steps.forEach((step, index) => addText(`${String(index + 1).padStart(2, "0")}. ${step}`, 11, details.step === index ? "#ffd27c" : "#afc4b4", 125));
  y += 8;
  addText("SOURCE SNAPSHOT", 12, "#8de0ad");
  addText(`github.com/${details.repository} / reviewed ${details.revision}`, 11, "#afc4b4");
  details.sources.forEach((source) => addText(source, 10, "#afc4b4", 140));
  y += 8;
  addText(details.note, 10, "#c5b493", 140);
  output.setAttribute("height", String(Math.ceil(y + 20)));
  output.setAttribute("viewBox", `0 0 ${width} ${Math.ceil(y + 20)}`);
  const serialized = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(output)}`;
  const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
  const link = document.createElement("a");
  const filename = `${details.project}-${details.flow}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  link.href = url;
  link.download = `${filename}-architecture.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
