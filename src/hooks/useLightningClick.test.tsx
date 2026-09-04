import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  useLightningClick,
  createLightningClickController,
  checkReducedMotion,
  computeClickPosition,
} from "./useLightningClick";
import { BoltFlash } from "@/components/BoltFlash";
import { Button } from "@/components/Button";

describe("useLightningClick and BoltFlash", () => {
  const originalWindow = global.window;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      // @ts-expect-error cleanup
      delete global.window;
    }
  });

  describe("1. Original onClick handler fires", () => {
    it("fires the original onClick handler when the wrapped button is clicked", () => {
      const originalOnClick = vi.fn();
      const controller = createLightningClickController({ onClick: originalOnClick });

      const mockEvent = {
        type: "click",
        defaultPrevented: false,
      } as unknown as React.MouseEvent<HTMLButtonElement>;

      controller.handleClick(mockEvent);

      expect(originalOnClick).toHaveBeenCalledTimes(1);
      expect(originalOnClick).toHaveBeenCalledWith(mockEvent);
    });

    it("does not fire onClick or trigger microanimation when disabled", () => {
      const originalOnClick = vi.fn();
      const controller = createLightningClickController({
        onClick: originalOnClick,
        disabled: true,
      });

      const mockEvent = {
        type: "click",
      } as unknown as React.MouseEvent<HTMLButtonElement>;

      controller.handleClick(mockEvent);

      expect(originalOnClick).not.toHaveBeenCalled();
      expect(controller.getNonce()).toBe(0);
      expect(controller.getBolt()).toBeNull();
      expect(controller.getFlash()).toBeNull();
      expect(controller.getGlowClass()).toBe("");
    });

    it("fires onClick when used inside the React hook during component render", () => {
      const originalOnClick = vi.fn();
      let capturedResult: ReturnType<typeof useLightningClick> | null = null;

      function TestButton() {
        const result = useLightningClick({ onClick: originalOnClick });
        capturedResult = result;
        return (
          <button type="button" onClick={result.handleClick} className={result.glowClass}>
            {result.flash}
            {result.bolt}
            Click me
          </button>
        );
      }

      renderToString(<TestButton />);
      expect(capturedResult).not.toBeNull();

      const mockEvent = { type: "click" } as unknown as React.MouseEvent<HTMLButtonElement>;
      capturedResult!.handleClick(mockEvent);

      expect(originalOnClick).toHaveBeenCalledTimes(1);
      expect(originalOnClick).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("2. Render key changes / remounts on click", () => {
    it("changes the bolt render key and remounts on every click", () => {
      const controller = createLightningClickController();

      // Before any click, no bolt is rendered
      expect(controller.getNonce()).toBe(0);
      expect(controller.getBolt()).toBeNull();

      // First click
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);
      expect(controller.getNonce()).toBe(1);

      const bolt1 = controller.getBolt();
      expect(bolt1).not.toBeNull();
      expect(bolt1?.key).toBe("bolt-1");

      // Second click (e.g. rapid consecutive click)
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);
      expect(controller.getNonce()).toBe(2);

      const bolt2 = controller.getBolt();
      expect(bolt2).not.toBeNull();
      expect(bolt2?.key).toBe("bolt-2");

      // Verify key changed so React remounts the element to restart the CSS animation
      expect(bolt1?.key).not.toBe(bolt2?.key);

      // Third click
      controller.trigger();
      expect(controller.getNonce()).toBe(3);
      const bolt3 = controller.getBolt();
      expect(bolt3?.key).toBe("bolt-3");
    });

    it("BoltFlash directly renders with key matching nonce prop", () => {
      const vnode0 = BoltFlash({ nonce: 0 });
      expect(vnode0).toBeNull();

      const vnode1 = BoltFlash({ nonce: 1, size: "md" });
      expect(vnode1).not.toBeNull();
      expect(vnode1?.key).toBe("bolt-wrap-1");

      const vnode2 = BoltFlash({ nonce: 2, size: "md" });
      expect(vnode2).not.toBeNull();
      expect(vnode2?.key).toBe("bolt-wrap-2");
      expect(vnode1?.key).not.toBe(vnode2?.key);
    });
  });

  describe("3. Prefers-reduced-motion: reduce static state", () => {
    it("renders the bolt in its static (no-motion) state when prefers-reduced-motion matches", () => {
      // Mock window.matchMedia for reduced motion
      const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      // @ts-expect-error mock window in node env
      global.window = { matchMedia: matchMediaMock };

      expect(checkReducedMotion()).toBe(true);

      const controller = createLightningClickController();
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);

      expect(controller.getIsReducedMotion()).toBe(true);

      const bolt = controller.getBolt();
      expect(bolt).not.toBeNull();

      const html = renderToString(bolt!);
      // Must contain static class and reduced-motion data attribute
      expect(html).toContain("adig-zap--static");
      expect(html).toContain('data-reduced-motion="true"');
    });

    it("renders the bolt in animated state when reduced-motion does not match", () => {
      const matchMediaMock = vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
      }));

      // @ts-expect-error mock window in node env
      global.window = { matchMedia: matchMediaMock };

      expect(checkReducedMotion()).toBe(false);

      const controller = createLightningClickController();
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);

      expect(controller.getIsReducedMotion()).toBe(false);

      const bolt = controller.getBolt();
      expect(bolt).not.toBeNull();

      const html = renderToString(bolt!);
      expect(html).not.toContain("adig-zap--static");
      expect(html).toContain('data-reduced-motion="false"');
    });

    it("BoltFlash accepts isReducedMotion prop directly", () => {
      const animatedHtml = renderToString(<BoltFlash nonce={1} isReducedMotion={false} />);
      expect(animatedHtml).not.toContain("adig-zap--static");
      expect(animatedHtml).toContain('data-reduced-motion="false"');

      const staticHtml = renderToString(<BoltFlash nonce={1} isReducedMotion={true} />);
      expect(staticHtml).toContain("adig-zap--static");
      expect(staticHtml).toContain('data-reduced-motion="true"');
    });
  });

  describe("4. Dynamic click-coordinate positioning", () => {
    it("calculates click position relative to the button bounding rect", () => {
      const mockRect = {
        left: 100,
        top: 200,
        width: 160,
        height: 48,
        right: 260,
        bottom: 248,
        x: 100,
        y: 200,
        toJSON: () => {},
      };

      const mockEvent = {
        clientX: 145,
        clientY: 224,
        currentTarget: {
          getBoundingClientRect: () => mockRect,
        },
      } as unknown as React.MouseEvent<HTMLButtonElement>;

      const pos = computeClickPosition(mockEvent);
      expect(pos).toEqual({
        x: 45, // 145 - 100
        y: 24, // 224 - 200
      });

      const controller = createLightningClickController();
      controller.handleClick(mockEvent);

      expect(controller.getPosition()).toEqual({ x: 45, y: 24 });

      const bolt = controller.getBolt();
      expect(bolt).not.toBeNull();

      const html = renderToString(bolt!);
      expect(html).toContain("left:45px");
      expect(html).toContain("top:24px");
      expect(html).toContain("transform:translate(-50%, -50%)");
    });

    it("falls back to the button center coordinates when clientX === 0 and clientY === 0 (keyboard activation)", () => {
      const mockRect = {
        left: 50,
        top: 80,
        width: 200,
        height: 50,
        right: 250,
        bottom: 130,
        x: 50,
        y: 80,
        toJSON: () => {},
      };

      // Native keyboard-triggered click events report clientX === 0 && clientY === 0
      const keyboardEvent = {
        clientX: 0,
        clientY: 0,
        currentTarget: {
          getBoundingClientRect: () => mockRect,
        },
      } as unknown as React.MouseEvent<HTMLButtonElement>;

      const pos = computeClickPosition(keyboardEvent);
      expect(pos).toEqual({
        x: 100, // 200 / 2
        y: 25,  // 50 / 2
      });

      const controller = createLightningClickController();
      controller.handleClick(keyboardEvent);

      expect(controller.getPosition()).toEqual({ x: 100, y: 25 });

      const bolt = controller.getBolt();
      expect(bolt).not.toBeNull();

      const html = renderToString(bolt!);
      expect(html).toContain("left:100px");
      expect(html).toContain("top:25px");
      expect(html).toContain("transform:translate(-50%, -50%)");
    });

    it("BoltFlash applies inline position style directly when provided", () => {
      const html = renderToString(
        <BoltFlash nonce={1} position={{ x: 72, y: 24 }} size="md" />
      );

      expect(html).toContain("left:72px");
      expect(html).toContain("top:24px");
      expect(html).toContain("transform:translate(-50%, -50%)");
    });
  });

  describe("5. Tactile squish, flash overlay, and glow pulse", () => {
    it("returns null flash and empty glowClass before click", () => {
      const controller = createLightningClickController();
      expect(controller.getFlash()).toBeNull();
      expect(controller.getGlowClass()).toBe("");
    });

    it("renders flash overlay and alternates glow pulse classes on rapid clicks", () => {
      const controller = createLightningClickController();

      // Click 1
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);
      expect(controller.getGlowClass()).toBe("adig-glow-pulse");

      const flash1 = controller.getFlash();
      expect(flash1).not.toBeNull();
      expect(flash1?.key).toBe("flash-1");

      // Verify flash and bolt keys are distinct to prevent duplicate key collision warnings
      const bolt1 = controller.getBolt();
      expect(flash1?.key).not.toBe(bolt1?.key);

      const flash1Html = renderToString(flash1!);
      expect(flash1Html).toContain("adig-flash");
      expect(flash1Html).toContain('aria-hidden="true"');

      // Click 2 (rapid re-click)
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);
      expect(controller.getGlowClass()).toBe("adig-glow-pulse-alt");
      const flash2 = controller.getFlash();
      expect(flash2?.key).toBe("flash-2");

      // Click 3
      controller.trigger();
      expect(controller.getGlowClass()).toBe("adig-glow-pulse");
      expect(controller.getFlash()?.key).toBe("flash-3");
    });

    it("suppresses glow class and applies static flash under reduced motion", () => {
      const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      // @ts-expect-error mock window
      global.window = { matchMedia: matchMediaMock };

      const controller = createLightningClickController();
      controller.handleClick({} as React.MouseEvent<HTMLButtonElement>);

      expect(controller.getGlowClass()).toBe(""); // glow suppressed in reduced motion

      const flash = controller.getFlash();
      expect(flash).not.toBeNull();
      const flashHtml = renderToString(flash!);
      expect(flashHtml).toContain("adig-flash--static");
    });

    it("Button component renders adig-btn-squish class and preserves relative label layering", () => {
      const html = renderToString(
        <Button size="md" variant="primary">
          Submit Claim
        </Button>
      );

      // Button has tactile squish class
      expect(html).toContain("adig-btn-squish");
      // Button has position: relative
      expect(html).toContain("position:relative");
      // Label is rendered with position: relative so it paints above the flash overlay
      expect(html).toContain('style="position:relative">Submit Claim</span>');
    });
  });

  describe("Accessibility and visual spec compliance", () => {
    it("marks the bolt wrapper and SVG with aria-hidden and pointer-events none", () => {
      const html = renderToString(<BoltFlash nonce={1} size="md" />);

      // Must be aria-hidden so screen readers ignore it
      expect(html).toContain('aria-hidden="true"');
      // Must have pointer-events: none so clicks pass through
      expect(html).toContain("pointer-events:none");
      // Must use the exact brand lightning path precedent from IntroCurtain
      expect(html).toContain('d="M64 6 L40 46 L56 46 L36 94"');
      expect(html).toContain('viewBox="0 0 100 100"');
      // Fix 2: 40px bounding box
      expect(html).toContain('width="40"');
      expect(html).toContain('height="40"');
    });

    it("renders size classes matching the button size", () => {
      const smHtml = renderToString(<BoltFlash nonce={1} size="sm" />);
      expect(smHtml).toContain("adig-zap--sm");

      const mdHtml = renderToString(<BoltFlash nonce={1} size="md" />);
      expect(mdHtml).toContain("adig-zap--md");

      const lgHtml = renderToString(<BoltFlash nonce={1} size="lg" />);
      expect(lgHtml).toContain("adig-zap--lg");
    });

    it("Button component has position: relative and wires useLightningClick", () => {
      const onClick = vi.fn();
      const html = renderToString(
        <Button onClick={onClick} size="md" variant="primary">
          Action
        </Button>
      );

      // Containing block for the bolt overlay
      expect(html).toContain("position:relative");
      expect(html).toContain("Action");
    });
  });
});
