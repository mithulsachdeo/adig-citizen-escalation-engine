import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Mascot } from "./Mascot";

describe("Mascot component", () => {
  it("renders all four expressions without error", () => {
    for (const expression of ["neutral", "happy", "sad", "helping"] as const) {
      const html = renderToString(<Mascot expression={expression} size={140} />);
      expect(html).toContain("<svg");
      expect(html).toContain('viewBox="0 0 280 360"');
      expect(html).toContain('id="mascot-body-group"');
    }
  });

  it("calculates width and height respecting the 280:360 aspect ratio", () => {
    const size = 180;
    const expectedWidth = Math.round(size * (280 / 360)); // 140
    const html = renderToString(<Mascot expression="neutral" size={size} />);
    expect(html).toContain(`width:${expectedWidth}px`);
    expect(html).toContain(`height:${size}px`);
  });

  it("assigns scoped IDs to avoid defs collisions across instances", () => {
    const html1 = renderToString(<Mascot expression="sad" size={72} />);
    const html2 = renderToString(<Mascot expression="helping" size={128} />);

    // Extract scoped IDs for suit-grad or bolt-glow
    const match1 = html1.match(/id="([^"]+bolt-glow)"/);
    const match2 = html2.match(/id="([^"]+bolt-glow)"/);

    expect(match1).not.toBeNull();
    expect(match2).not.toBeNull();
    // In concurrent or distinct renders, IDs exist and url references match the id
    const id1 = match1![1];
    expect(html1).toContain(`url(#${id1})`);

    const id2 = match2![1];
    expect(html2).toContain(`url(#${id2})`);
  });

  it("renders both mascots together with distinct scoped IDs", () => {
    const combined = renderToString(
      <div>
        <Mascot expression="sad" size={72} />
        <Mascot expression="helping" size={128} />
      </div>
    );

    const matches = Array.from(combined.matchAll(/id="([^"]+bolt-glow)"/g)).map((m) => m[1]);
    expect(matches.length).toBe(2);
    expect(matches[0]).not.toBe(matches[1]);
    expect(combined).toContain(`url(#${matches[0]})`);
    expect(combined).toContain(`url(#${matches[1]})`);
  });

  it("handles alt accessibility attributes properly", () => {
    // Decorative (empty alt) -> aria-hidden
    const decorative = renderToString(<Mascot expression="neutral" alt="" />);
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).not.toContain('role="img"');

    // Semantic (non-empty alt) -> role="img" and aria-label
    const semantic = renderToString(<Mascot expression="happy" alt="Friendly energy mascot" />);
    expect(semantic).toContain('role="img"');
    expect(semantic).toContain('aria-label="Friendly energy mascot"');
    expect(semantic).not.toContain('aria-hidden="true"');
  });

  it("renders expression-specific anatomical features", () => {
    const sadHtml = renderToString(<Mascot expression="sad" />);
    // Sad expression has the tear path
    expect(sadHtml).toContain("M126 104 q4 6 0 9 q-4 -3 0 -9 Z");

    const helpingHtml = renderToString(<Mascot expression="helping" />);
    // Helping expression has charge ring
    expect(helpingHtml).toContain('r="30"');

    const happyHtml = renderToString(<Mascot expression="happy" />);
    // Happy mouth
    expect(happyHtml).toContain("M126 108 Q 140 126 154 108");
  });
});
