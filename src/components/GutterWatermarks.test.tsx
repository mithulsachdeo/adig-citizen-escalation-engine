import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GutterWatermarks } from "./GutterWatermarks";
import CheckLayout from "@/app/check/layout";

describe("GutterWatermarks component", () => {
  it("renders server-side with aria-hidden and both watermark gutters", () => {
    const html = renderToString(<GutterWatermarks />);

    // Container is marked aria-hidden for accessibility
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("adig-gutter-watermarks");

    // Both left (mascot) and right (bolt) gutters exist
    expect(html).toContain("adig-gutter-watermark--left");
    expect(html).toContain("adig-gutter-watermark--right");
  });

  it("renders the neutral mascot silhouette in the left gutter", () => {
    const html = renderToString(<GutterWatermarks />);

    // Left SVG has canonical 280x360 viewBox
    expect(html).toContain('viewBox="0 0 280 360"');
    expect(html).toContain("adig-gutter-watermark__mascot");

    // Contains silhouette shapes: cape, head, body, legs, feet, right arm and bolt
    expect(html).toContain("M80 120 L50 280 Q 140 300 230 280 L200 120 Z"); // Cape
    expect(html).toContain('circle cx="140" cy="100" r="45"'); // Head
    expect(html).toContain('rect x="100" y="140" width="80" height="120" rx="30"'); // Body
    expect(html).toContain('rect x="115" y="240" width="20" height="60" rx="10"'); // Leg
    expect(html).toContain('circle cx="215" cy="105" r="16"'); // Fist
  });

  it("renders the tight-viewBox lightning bolt in the right gutter", () => {
    const html = renderToString(<GutterWatermarks />);

    // Right SVG has tight 205 30 40 90 viewBox and preserveAspectRatio="none"
    expect(html).toContain('viewBox="205 30 40 90"');
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).toContain("adig-gutter-watermark__bolt");

    // Exact bolt path extracted from the mascot
    expect(html).toContain('d="M225 30 L205 70 h20 L210 120 L245 60 h-20 L235 30 Z"');
  });

  it("CheckLayout renders watermarks alongside page children", () => {
    const html = renderToString(
      <CheckLayout>
        <div data-testid="check-child">Bill Intake Content</div>
      </CheckLayout>
    );

    expect(html).toContain("adig-gutter-watermarks");
    expect(html).toContain("Bill Intake Content");
  });
});
