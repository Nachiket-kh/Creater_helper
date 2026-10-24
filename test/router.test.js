import assert from "node:assert/strict";
import test from "node:test";

import { routeFor } from "../src/router.js";
import { money, titleCase } from "../src/api.js";

test("routeFor returns a safe not-found result for malformed deal IDs", () => {
  assert.deepEqual(routeFor("/deals/%E0%A4%A"), { page: "not-found" });
  assert.deepEqual(routeFor("/deals/brand%20one"), { page: "detail", id: "brand one" });
});

test("creator page helpers format budgets and underscore statuses", () => {
  assert.equal(money(null), "No fee");
  assert.equal(money(1234), "₹1,234");
  assert.equal(titleCase("paid_collab"), "Paid Collab");
});
