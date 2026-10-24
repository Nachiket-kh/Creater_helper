import assert from "node:assert/strict";
import test from "node:test";

import { routeFor } from "../src/router.js";

test("routeFor returns a safe not-found result for malformed deal IDs", () => {
  assert.deepEqual(routeFor("/deals/%E0%A4%A"), { page: "not-found" });
  assert.deepEqual(routeFor("/deals/brand%20one"), { page: "detail", id: "brand one" });
});
