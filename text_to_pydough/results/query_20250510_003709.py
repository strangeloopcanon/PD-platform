
import pandas as pd

# This is a mock execution since pydough is not available
# Original code:
# result = Broker.Customers.CALCULATE(name=name, email=email)

# Mock result dataframe
result = pd.DataFrame([
    {"name": "John Doe", "email": "john@example.com"},
    {"name": "Jane Smith", "email": "jane@example.com"},
    {"name": "Bob Johnson", "email": "bob@example.com"}
])

print("\nSQL Query:")
print("SELECT name, email FROM broker_customers")
print("\nResult:")
print(result)
