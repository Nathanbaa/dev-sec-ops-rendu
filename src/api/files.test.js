import { describe, it, expect } from "vitest";
import files from "./files.js";

describe("files module", () => {
  it("test() returns 1", () => {
    expect(files.test()).toBe(1);
  });

  it("upload_path returns a path containing uploads", () => {
    expect(files.upload_path()).toContain("uploads");
  });
});
