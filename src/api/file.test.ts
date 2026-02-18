import { describe, it, expect } from "vitest";
import * as files from "./files";
import path from "path";

describe("uploadFiles", () => {
  it("should return the file test", () => {
    const uploadPath = files.upload_path();
    // path.join() résout le chemin en chemin absolu, donc on vérifie qu'il se termine par "uploads"
    expect(uploadPath).toMatch(/uploads$/);
    // Ou vérifier que c'est un chemin valide qui contient "uploads"
    expect(uploadPath).toContain("uploads");
  });
});
