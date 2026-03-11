import { describe, it, expect } from "vitest";
import { fullName, personIcon } from "./PersonCard";

describe("fullName", () => {
  it("joins first and family name when no middle name", () => {
    expect(fullName({ first_name: "Alice", family_name: "Smith" })).toBe("Alice Smith");
  });

  it("includes middle name when present", () => {
    expect(
      fullName({ first_name: "Alice", middle_name: "Marie", family_name: "Smith" })
    ).toBe("Alice Marie Smith");
  });

  it("skips null middle name", () => {
    expect(
      fullName({ first_name: "Bob", middle_name: null, family_name: "Jones" })
    ).toBe("Bob Jones");
  });

  it("skips undefined middle name", () => {
    expect(
      fullName({ first_name: "Bob", middle_name: undefined, family_name: "Jones" })
    ).toBe("Bob Jones");
  });
});

describe("personIcon", () => {
  it("returns 👩 for Female", () => {
    expect(personIcon("Female")).toBe("👩");
  });

  it("returns 👨 for Male", () => {
    expect(personIcon("Male")).toBe("👨");
  });
});
