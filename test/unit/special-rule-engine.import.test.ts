import { describe, expect, it } from "vitest";
import { evaluateRules } from "special-rule-engine";

describe("special-rule-engine import (backend)", () => {
    it("can import and run a trivial rule", () => {
        const results = evaluateRules(
            [
                {
                    id: "r1",
                    type: "use",
                    constraint: "MUST_HAVE",
                    message: "must include main",
                    params: { target: "main" },
                },
            ],
            { language: "c", sourceText: "int main(){}" },
        );

        expect(results[0]?.passed).toBe(true);
    });
});
