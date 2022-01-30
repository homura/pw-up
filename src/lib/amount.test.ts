import { BI } from "@ckb-lumos/lumos";
import { humanize } from "./amount";

test("test humanize", () => {
  expect(humanize(BI.from(12300000000), { decimals: 8 })).toBe("123");
  expect(humanize(BI.from(12300000001), { decimals: 8 })).toBe("123");
  expect(humanize(BI.from(12300000001), { decimals: 8, maxDisplayDecimals: 8 })).toBe("123.00000001");
  expect(humanize(BI.from(12300000001), { decimals: 8, maxDisplayDecimals: 7 })).toBe("123");
  expect(humanize(BI.from(12300000001), { decimals: 8, symbol: "CKB" })).toBe("123 CKB");

  expect(humanize(BI.from(12300000), { decimals: 8, symbol: "CKB" })).toBe("0.123 CKB");
  expect(humanize(BI.from(123400000001), { decimals: 8, symbol: "CKB" })).toBe("1,234 CKB");
  expect(humanize(BI.from(123400000001), { decimals: 8, symbol: "CKB", maxDisplayDecimals: 8 })).toBe(
    "1,234.00000001 CKB"
  );

  expect(humanize(BI.from(123443210001), { decimals: 8, symbol: "CKB" })).toBe("1,234.4321 CKB");
});
