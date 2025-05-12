
import pydough
from pydough import init_pydough_context

# Load metadata and connect to database
pydough.active_session.load_metadata_graph("data/tpch_demo_graph.json", "TPCH")
pydough.active_session.connect_database("sqlite", database="data/tpch.db")

@init_pydough_context(pydough.active_session.metadata)
def func():
    # Generated PyDough code
    result = TPCH.Supplier.CALCULATE(supplier_name = name, region_name = nation.region.name)
    return result

result = func()
print("\nSQL Query:")
print(pydough.to_sql(result))
print("\nResult:")
print(pydough.to_df(result).head(10))  # Show only first 10 rows
