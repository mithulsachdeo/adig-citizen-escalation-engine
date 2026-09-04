import { test, expect, beforeEach, afterEach } from "vitest";
import { analytics, bucketOvercharge, _setSinkForTest, type AnalyticsProps } from "./analytics";

type Captured = { event: string; props: AnalyticsProps };
let events: Captured[] = [];

beforeEach(() => {
  events = [];
  _setSinkForTest((event, props) => events.push({ event, props }));
});

afterEach(() => {
  _setSinkForTest(null);
});

test("bucketOvercharge maps rupees to coarse ranges, never the exact figure", () => {
  expect(bucketOvercharge(0)).toBe("none");
  expect(bucketOvercharge(-50)).toBe("none");
  expect(bucketOvercharge(1)).toBe("1-499");
  expect(bucketOvercharge(499)).toBe("1-499");
  expect(bucketOvercharge(500)).toBe("500-999");
  expect(bucketOvercharge(999)).toBe("500-999");
  expect(bucketOvercharge(1000)).toBe("1000-2499");
  expect(bucketOvercharge(2499)).toBe("1000-2499");
  expect(bucketOvercharge(2500)).toBe("2500-4999");
  expect(bucketOvercharge(4999)).toBe("2500-4999");
  expect(bucketOvercharge(5000)).toBe("5000-9999");
  expect(bucketOvercharge(9999)).toBe("5000-9999");
  expect(bucketOvercharge(10000)).toBe("10000+");
  expect(bucketOvercharge(999999)).toBe("10000+");
});

test("bucketOvercharge tolerates non-finite input by returning 'none'", () => {
  expect(bucketOvercharge(Number.NaN)).toBe("none");
  expect(bucketOvercharge(Number.POSITIVE_INFINITY)).toBe("none");
});

test("landing_viewed carries no properties", () => {
  analytics.landingViewed();
  expect(events).toHaveLength(1);
  expect(events[0].event).toBe("landing_viewed");
  expect(events[0].props).toEqual({});
});

test("hero_passed carries no properties", () => {
  analytics.heroPassed();
  expect(events).toHaveLength(1);
  expect(events[0].event).toBe("hero_passed");
  expect(events[0].props).toEqual({});
});

test("intake_started carries no properties", () => {
  analytics.intakeStarted();
  expect(events).toHaveLength(1);
  expect(events[0].event).toBe("intake_started");
  expect(events[0].props).toEqual({});
});

test("diagnosis_started carries no properties", () => {
  analytics.diagnosisStarted();
  expect(events).toHaveLength(1);
  expect(events[0].event).toBe("diagnosis_started");
  expect(events[0].props).toEqual({});
});

test("overcharge_calculated sends only the bucket + actionable flag — never the amount", () => {
  analytics.overchargeCalculated(3200, true);
  expect(events).toHaveLength(1);
  expect(events[0].event).toBe("overcharge_calculated");
  expect(events[0].props).toEqual({ bucket: "2500-4999", actionable: true });
  // The raw amount must not leak in any property value.
  const serialized = JSON.stringify(events[0].props);
  expect(serialized).not.toContain("3200");
});

test("instrument_generated / guidance_viewed / escalation_submitted carry only the tier id", () => {
  analytics.instrumentGenerated("icrs");
  analytics.guidanceViewed("cgrf-schedule-a");
  analytics.escalationSubmitted("ombudsman-schedule-b");
  expect(events.map((e) => e.event)).toEqual([
    "instrument_generated",
    "guidance_viewed",
    "escalation_submitted",
  ]);
  expect(events[0].props).toEqual({ tier: "icrs" });
  expect(events[1].props).toEqual({ tier: "cgrf-schedule-a" });
  expect(events[2].props).toEqual({ tier: "ombudsman-schedule-b" });
});

test("empty tier falls back to 'none' rather than an empty string", () => {
  analytics.instrumentGenerated("");
  expect(events[0].props).toEqual({ tier: "none" });
});

test("letter_obtained carries tier and method for download, copy_button, and copy_event", () => {
  analytics.letterObtained("icrs", "download");
  analytics.letterObtained("cgrf-schedule-a", "copy_button");
  analytics.letterObtained("ombudsman-schedule-b", "copy_event");
  expect(events.map((e) => e.event)).toEqual([
    "letter_obtained",
    "letter_obtained",
    "letter_obtained",
  ]);
  expect(events[0].props).toEqual({ tier: "icrs", method: "download" });
  expect(events[1].props).toEqual({ tier: "cgrf-schedule-a", method: "copy_button" });
  expect(events[2].props).toEqual({ tier: "ombudsman-schedule-b", method: "copy_event" });
});

test("letter_obtained falls back to 'none' when tier is empty", () => {
  analytics.letterObtained("", "copy_button");
  expect(events[0].props).toEqual({ tier: "none", method: "copy_button" });
});

test("no event exposes PII-shaped keys", () => {
  analytics.landingViewed();
  analytics.heroPassed();
  analytics.intakeStarted();
  analytics.diagnosisStarted();
  analytics.overchargeCalculated(1200, true);
  analytics.instrumentGenerated("icrs");
  analytics.letterObtained("icrs", "download");
  const forbidden = ["name", "address", "consumerNo", "description", "narrative", "amount", "units", "email"];
  for (const { props } of events) {
    for (const key of Object.keys(props)) {
      expect(forbidden).not.toContain(key);
    }
  }
});
