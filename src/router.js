export function routeFor(path = "") {
  const currentPath = typeof path === "string" ? path : "";

  try {
    const normalized = decodeURIComponent(currentPath);

    if (normalized === "/" || normalized === "") return { page: "today" };
    if (normalized === "/inbox") return { page: "inbox" };
    if (normalized === "/deals") return { page: "deals" };
    if (normalized.startsWith("/deals/")) {
      const id = normalized.slice("/deals/".length);
      if (!id) return { page: "not-found" };
      return { page: "detail", id };
    }
    if (normalized === "/content") return { page: "content" };
    if (normalized === "/kit") return { page: "kit" };
    if (normalized === "/voice") return { page: "voice" };
    return { page: "not-found" };
  } catch {
    return { page: "not-found" };
  }
}
