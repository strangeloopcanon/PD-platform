#!/usr/bin/env python3

"""Unittest for verifying LLM structured output."""

import json
import unittest
from pydantic import BaseModel
from typing import Optional
import llm


class PyDoughResponse(BaseModel):
    """Structured response from LLM."""

    code: str
    explanation: Optional[str] = None


class LLMStructuredOutputTest(unittest.TestCase):
    """Tests conversion of natural language to PyDough code."""

    def test_prompt_returns_code_field(self):
        """Ensure structured output contains a ``code`` field."""

        try:
            model = llm.get_model("gemini-2.5-pro-preview-05-06")
        except llm.UnknownModelError:
            self.skipTest("gemini-2.5-pro-preview-05-06 model alias is not installed")
        test_query = "Show me the top 5 stocks by trading volume."
        prompt = f"""
# Task: Convert this natural language query into PyDough code for a Broker database:
"{test_query}"

# Example Schema:
Broker database has tables for Customers, Transactions, and Stocks.

# Example PyDough code:
```python
result = Broker.Customer.CALCULATE(
    *  # Select all fields
)
```

# Your task:
Return PyDough code that answers the query.
Make sure to return a variable named 'result' with the correct PyDough query.
"""

        try:
            response = model.prompt(prompt, schema=PyDoughResponse)
            response_data = json.loads(response.text())
            self.assertIn("code", response_data)
        except Exception as e:  # pragma: no cover - network failure fallback
            print(f"\n❌ Error with structured output: {str(e)}")
            print("Falling back to unstructured output:")
            response = model.prompt(prompt)
            print(response)
            self.fail("Structured output failed")


if __name__ == "__main__":
    unittest.main()
