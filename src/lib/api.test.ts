import { describe, it, expect } from "vitest";
import { rawId } from "./api";

describe("rawId", () => {
  it("strips the person: prefix", () => {
    expect(rawId("person:01jd4a8xyz")).toBe("01jd4a8xyz");
  });

  it("returns the string unchanged when there is no prefix", () => {
    expect(rawId("01jd4a8xyz")).toBe("01jd4a8xyz");
  });

  it("only strips the first person: prefix", () => {
    expect(rawId("person:person:abc")).toBe("person:abc");
  });
});
