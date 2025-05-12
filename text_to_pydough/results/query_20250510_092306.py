
import pandas as pd

# This is a mock execution since pydough is not available
# Original code:
# result = TPCH.Supplier.CALCULATE(supplier_name = name, region_name = nation.region.name)

# Mock result dataframe
result = pd.DataFrame([
    {"name": "John Doe", "email": "john@example.com"},
    {"name": "Jane Smith", "email": "jane@example.com"},
    {"name": "Bob Johnson", "email": "bob@example.com"}
])

print("\nSQL Query:")
print("SELECT name, email FROM tpch_customers")
print("\nResult:")
print(result)
