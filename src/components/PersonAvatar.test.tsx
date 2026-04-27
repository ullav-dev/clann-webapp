// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import PersonAvatar from "./PersonAvatar";

vi.mock("next/image", () => ({
  default: ({ src, alt, fill: _fill, sizes: _sizes, unoptimized: _unoptimized, onError, className }: {
    src: string; alt: string; fill?: boolean; sizes?: string; unoptimized?: boolean;
    onError?: () => void; className?: string;
  }) => <img src={src} alt={alt} onError={onError} className={className} />,
}));

afterEach(cleanup);

const basePerson = { id: "person:01jd", sex: "Male" as const, image_path: null };

describe("PersonAvatar", () => {
  it("renders emoji fallback when no image_path", () => {
    render(<PersonAvatar person={basePerson} size={44} />);
    const el = screen.getByRole("img");
    expect(el.tagName).toBe("SPAN");
    expect(el.textContent).toBe("👨");
    expect(el).toHaveAttribute("aria-label", "Male");
  });

  it("renders female emoji for Female sex", () => {
    const p = { ...basePerson, sex: "Female" as const };
    render(<PersonAvatar person={p} size={44} />);
    expect(screen.getByRole("img").textContent).toBe("👩");
  });

  it("applies the size as inline style on the fallback span", () => {
    render(<PersonAvatar person={basePerson} size={64} />);
    const el = screen.getByRole("img");
    expect(el).toHaveStyle({ width: "64px", height: "64px" });
  });

  it("renders an <img> element when image_path is set", () => {
    const p = { ...basePerson, image_path: "profile.jpg" };
    const { container } = render(<PersonAvatar person={p} size={44} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("/api/persons/");
  });

  it("appends imageVersion query param to src when provided", () => {
    const p = { ...basePerson, image_path: "profile.jpg" };
    const { container } = render(<PersonAvatar person={p} size={44} imageVersion={3} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("?v=3");
  });
});
