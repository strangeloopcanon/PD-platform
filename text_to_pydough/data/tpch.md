# TPCH Database Documentation

## Summary

The TPCH database is a benchmark database designed for decision support systems. It simulates the business activities of a wholesale supplier managing parts, suppliers, customers, and orders. The database comprises several interconnected tables (collections) that store detailed information about these entities and their relationships, including geographical data (nations and regions). This documentation provides details for each collection, including column descriptions, unique properties, and example queries.

## Collections (Tables)

The TPCH database includes the following collections:

*   [NATION](#nation)
*   [REGION](#region)
*   [PART](#part)
*   [SUPPLIER](#supplier)
*   [PARTSUPP](#partsupp)
*   [CUSTOMER](#customer)
*   [ORDERS](#orders)
*   [LINEITEM](#lineitem)

---

### NATION

**Description:** Stores information about nations. Each nation is associated with a region.

**Columns:**

| Column Name   | Data Type | Description                                                                                                |
| :------------ | :-------- | :--------------------------------------------------------------------------------------------------------- |
| `N_NATIONKEY` | `int64`   | Unique identifier for the nation. This is the primary key.                                                 |
| `N_NAME`      | `string`  | Name of the nation (e.g., 'ALGERIA', 'CANADA').                                                            |
| `N_REGIONKEY` | `int64`   | Foreign key referencing `R_REGIONKEY` in the `REGION` table, linking the nation to its geographical region. |
| `N_COMMENT`   | `string`  | Miscellaneous comments about the nation.                                                                   |

**Unique Properties:**

*   `N_NATIONKEY`: This column is the primary key for the `NATION` table. Each value uniquely identifies a nation.

**Primary Key:**

*   The primary key for this table is `N_NATIONKEY`.

**Example PyDough Queries:**

1.  Find the nation with the name 'CANADA':
    ```python
    NATION.query("N_NAME == 'CANADA'")
    ```
2.  Select the key and name of nations in region 1:
    ```python
    NATION.select("N_NATIONKEY", "N_NAME").query("N_REGIONKEY == 1")
    ```
3.  Count the number of nations:
    ```python
    NATION.count()
    ```

---

### REGION

**Description:** Stores information about geographical regions.

**Columns:**

| Column Name   | Data Type | Description                                                              |
| :------------ | :-------- | :----------------------------------------------------------------------- |
| `R_REGIONKEY` | `int64`   | Unique identifier for the region. This is the primary key.               |
| `R_NAME`      | `string`  | Name of the region (e.g., 'AFRICA', 'EUROPE').                           |
| `R_COMMENT`   | `string`  | Miscellaneous comments about the region.                                 |

**Unique Properties:**

*   `R_REGIONKEY`: This column is the primary key for the `REGION` table. Each value uniquely identifies a region.

**Primary Key:**

*   The primary key for this table is `R_REGIONKEY`.

**Example PyDough Queries:**

1.  Find the region named 'EUROPE':
    ```python
    REGION.query("R_NAME == 'EUROPE'")
    ```
2.  Select the key and name for all regions, limiting to the first 2 results:
    ```python
    REGION.select("R_REGIONKEY", "R_NAME").limit(2)
    ```

---

### PART

**Description:** Stores information about parts that can be ordered.

**Columns:**

| Column Name     | Data Type | Description                                                                                             |
| :-------------- | :-------- | :------------------------------------------------------------------------------------------------------ |
| `P_PARTKEY`     | `int64`   | Unique identifier for the part. This is the primary key.                                                |
| `P_NAME`        | `string`  | Name of the part (e.g., 'goldenrod lavender spring steel').                                              |
| `P_MFGR`        | `string`  | Manufacturer of the part (e.g., 'Manufacturer#1').                                                      |
| `P_BRAND`       | `string`  | Brand name of the part (e.g., 'Brand#12').                                                              |
| `P_TYPE`        | `string`  | Type or category of the part (e.g., 'SMALL PLATED COPPER').                                             |
| `P_SIZE`        | `int64`   | Size of the part (integer value).                                                                       |
| `P_CONTAINER`   | `string`  | Type of container the part is shipped in (e.g., 'SM BOX', 'LG DRUM').                                   |
| `P_RETAILPRICE` | `int64`   | Retail price of the part. Stored as an integer representing the value in cents (e.g., 12345 means $123.45). |
| `P_COMMENT`     | `string`  | Miscellaneous comments about the part.                                                                  |

**Unique Properties:**

*   `P_PARTKEY`: This column is the primary key for the `PART` table. Each value uniquely identifies a part.

**Primary Key:**

*   The primary key for this table is `P_PARTKEY`.

**Example PyDough Queries:**

1.  Find parts from 'Brand#23' with a size greater than 10:
    ```python
    PART.query("P_BRAND == 'Brand#23' and P_SIZE > 10")
    ```
2.  Select the name and retail price of parts of type 'STANDARD POLISHED TIN':
    ```python
    PART.select("P_NAME", "P_RETAILPRICE").query("P_TYPE == 'STANDARD POLISHED TIN'")
    ```
3.  Count parts from 'Manufacturer#5':
    ```python
    PART.query("P_MFGR == 'Manufacturer#5'").count()
    ```

---

### SUPPLIER

**Description:** Stores information about suppliers who provide parts.

**Columns:**

| Column Name   | Data Type | Description                                                                                                   |
| :------------ | :-------- | :------------------------------------------------------------------------------------------------------------ |
| `S_SUPPKEY`   | `int64`   | Unique identifier for the supplier. This is the primary key.                                                  |
| `S_NAME`      | `string`  | Name of the supplier (e.g., 'Supplier#000000001').                                                             |
| `S_ADDRESS`   | `string`  | Address of the supplier.                                                                                      |
| `S_NATIONKEY` | `int64`   | Foreign key referencing `N_NATIONKEY` in the `NATION` table, indicating the nation of the supplier.             |
| `S_PHONE`     | `string`  | Phone number of the supplier.                                                                                 |
| `S_ACCTBAL`   | `int64`   | Account balance of the supplier. Stored as an integer representing the value in cents (e.g., 500000 means $5000.00). |
| `S_COMMENT`   | `string`  | Miscellaneous comments about the supplier.                                                                    |

**Unique Properties:**

*   `S_SUPPKEY`: This column is the primary key for the `SUPPLIER` table. Each value uniquely identifies a supplier.

**Primary Key:**

*   The primary key for this table is `S_SUPPKEY`.

**Example PyDough Queries:**

1.  Find suppliers in nation 5 with an account balance greater than 500000 (i.e., $5000.00):
    ```python
    SUPPLIER.query("S_NATIONKEY == 5 and S_ACCTBAL > 500000")
    ```
2.  Select the name and phone number of a specific supplier:
    ```python
    SUPPLIER.select("S_NAME", "S_PHONE").query("S_NAME == 'Supplier#000000010'")
    ```
3.  Get all suppliers from nation with key 0 (e.g. 'ALGERIA'):
    ```python
    SUPPLIER.query("S_NATIONKEY == 0")
    ```

---

### PARTSUPP

**Description:** This is a junction table linking parts (`PART`) and suppliers (`SUPPLIER`). It details which suppliers offer which parts, their available quantity, and the supply cost.

**Columns:**

| Column Name     | Data Type | Description                                                                                                         |
| :-------------- | :-------- | :------------------------------------------------------------------------------------------------------------------ |
| `PS_PARTKEY`    | `int64`   | Foreign key referencing `P_PARTKEY` in the `PART` table. Part of the composite primary key.                         |
| `PS_SUPPKEY`    | `int64`   | Foreign key referencing `S_SUPPKEY` in the `SUPPLIER` table. Part of the composite primary key.                     |
| `PS_AVAILQTY`   | `int64`   | Available quantity of this part from this supplier.                                                                 |
| `PS_SUPPLYCOST` | `int64`   | Cost of this part from this supplier. Stored as an integer representing the value in cents (e.g., 5000 means $50.00). |
| `PS_COMMENT`    | `string`  | Miscellaneous comments about this part-supplier relationship.                                                       |

**Unique Properties:**

*   `PS_PARTKEY`, `PS_SUPPKEY`: The combination of these two columns forms a composite primary key for the `PARTSUPP` table. Each pair uniquely identifies a specific part offered by a specific supplier.

**Primary Key:**

*   This table uses a composite primary key: (`PS_PARTKEY`, `PS_SUPPKEY`).

**Example PyDough Queries:**

1.  Find supplier information for part key 100 where available quantity is greater than 500:
    ```python
    PARTSUPP.query("PS_PARTKEY == 100 and PS_AVAILQTY > 500")
    ```
2.  Select supplier key and supply cost for part key 205 where supply cost is less than 5000 (i.e., $50.00):
    ```python
    PARTSUPP.select("PS_SUPPKEY", "PS_SUPPLYCOST").query("PS_PARTKEY == 205 and PS_SUPPLYCOST < 5000")
    ```
3.  Find all parts supplied by supplier with key 1:
    ```python
    PARTSUPP.query("PS_SUPPKEY == 1")
    ```

---

### CUSTOMER

**Description:** Stores information about customers.

**Columns:**

| Column Name    | Data Type | Description                                                                                                   |
| :------------- | :-------- | :------------------------------------------------------------------------------------------------------------ |
| `C_CUSTKEY`    | `int64`   | Unique identifier for the customer. This is the primary key.                                                  |
| `C_NAME`       | `string`  | Name of the customer (e.g., 'Customer#000000001').                                                             |
| `C_ADDRESS`    | `string`  | Address of the customer.                                                                                      |
| `C_NATIONKEY`  | `int64`   | Foreign key referencing `N_NATIONKEY` in the `NATION` table, indicating the nation of the customer.             |
| `C_PHONE`      | `string`  | Phone number of the customer.                                                                                 |
| `C_ACCTBAL`    | `int64`   | Account balance of the customer. Stored as an integer representing the value in cents (e.g., 10000 means $100.00). |
| `C_MKTSEGMENT` | `string`  | Market segment of the customer (e.g., 'BUILDING', 'AUTOMOBILE').                                              |
| `C_COMMENT`    | `string`  | Miscellaneous comments about the customer.                                                                    |

**Unique Properties:**

*   `C_CUSTKEY`: This column is the primary key for the `CUSTOMER` table. Each value uniquely identifies a customer.

**Primary Key:**

*   The primary key for this table is `C_CUSTKEY`.

**Example PyDough Queries:**

1.  Find customers in the 'BUILDING' market segment from nation 10:
    ```python
    CUSTOMER.query("C_MKTSEGMENT == 'BUILDING' and C_NATIONKEY == 10")
    ```
2.  Select the name and account balance of customers with a negative account balance:
    ```python
    CUSTOMER.select("C_NAME", "C_ACCTBAL").query("C_ACCTBAL < 0")
    ```
3.  Get customer details for customer key 1:
    ```python
    CUSTOMER.query("C_CUSTKEY == 1")
    ```

---

### ORDERS

**Description:** Stores information about customer orders. Each order is placed by a customer.

**Columns:**

| Column Name       | Data Type | Description                                                                                                      |
| :---------------- | :-------- | :--------------------------------------------------------------------------------------------------------------- |
| `O_ORDERKEY`      | `int64`   | Unique identifier for the order. This is the primary key.                                                        |
| `O_CUSTKEY`       | `int64`   | Foreign key referencing `C_CUSTKEY` in the `CUSTOMER` table, indicating the customer who placed the order.       |
| `O_ORDERSTATUS`   | `string`  | Status of the order (e.g., 'F' for fulfilled, 'O' for open, 'P' for pending).                                  |
| `O_TOTALPRICE`    | `int64`   | Total price of the order. Stored as an integer representing the value in cents (e.g., 150050 means $1500.50).     |
| `O_ORDERDATE`     | `date`    | Date the order was placed (e.g., '1995-03-15').                                                                  |
| `O_ORDERPRIORITY` | `string`  | Priority of the order (e.g., '1-URGENT', '5-LOW').                                                               |
| `O_CLERK`         | `string`  | Identifier of the clerk who processed the order (e.g., 'Clerk#000000123').                                       |
| `O_SHIPPRIORITY`  | `int64`   | Shipping priority for the order (integer value, interpretation depends on system, often 0 for regular).          |
| `O_COMMENT`       | `string`  | Miscellaneous comments about the order.                                                                          |

**Unique Properties:**

*   `O_ORDERKEY`: This column is the primary key for the `ORDERS` table. Each value uniquely identifies an order.

**Primary Key:**

*   The primary key for this table is `O_ORDERKEY`.

**Example PyDough Queries:**

1.  Find fulfilled orders ('F') placed on or after January 1, 1995:
    ```python
    ORDERS.query("O_ORDERSTATUS == 'F' and O_ORDERDATE >= '1995-01-01'")
    ```
2.  Select order key, total price, and priority for urgent orders ('1-URGENT') by customer 13:
    ```python
    ORDERS.select("O_ORDERKEY", "O_TOTALPRICE", "O_ORDERPRIORITY").query("O_CUSTKEY == 13 and O_ORDERPRIORITY == '1-URGENT'")
    ```
3.  Count the number of orders processed by 'Clerk#000000880':
    ```python
    ORDERS.query("O_CLERK == 'Clerk#000000880'").count()
    ```

---

### LINEITEM

**Description:** Stores detailed information about individual items within each order. This is the largest table in the TPC-H schema.

**Columns:**

| Column Name       | Data Type | Description                                                                                                                               |
| :---------------- | :-------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `L_ORDERKEY`      | `int64`   | Foreign key referencing `O_ORDERKEY` in the `ORDERS` table. Part of the composite primary key.                                            |
| `L_PARTKEY`       | `int64`   | Foreign key referencing `P_PARTKEY` in the `PART` table, identifying the part in this line item.                                          |
| `L_SUPPKEY`       | `int64`   | Foreign key referencing `S_SUPPKEY` in the `SUPPLIER` table, identifying the supplier for this part.                                        |
| `L_LINENUMBER`    | `int64`   | Sequential number for the line item within an order. Part of the composite primary key.                                                   |
| `L_QUANTITY`      | `int64`   | Quantity of the part ordered in this line item.                                                                                           |
| `L_EXTENDEDPRICE` | `int64`   | Extended price (L_QUANTITY * part's original price). Stored as an integer representing cents.                                               |
| `L_DISCOUNT`      | `int64`   | Discount applied. Stored as an integer representing the percentage scaled by 100 (e.g., a value of 5 means a 0.05 or 5% discount).         |
| `L_TAX`           | `int64`   | Tax applied. Stored as an integer representing the percentage scaled by 100 (e.g., a value of 8 means a 0.08 or 8% tax).                    |
| `L_RETURNFLAG`    | `string`  | Flag indicating if the item was returned (e.g., 'R' for returned, 'A' for accepted, 'N' for none).                                        |
| `L_LINESTATUS`    | `string`  | Status of the line item (e.g., 'O' for open, 'F' for fulfilled).                                                                          |
| `L_SHIPDATE`      | `date`    | Date the line item was shipped.                                                                                                           |
| `L_COMMITDATE`    | `date`    | Date the supplier committed to ship the line item.                                                                                        |
| `L_RECEIPTDATE`   | `date`    | Date the customer received the line item.                                                                                                 |
| `L_SHIPINSTRUCT`  | `string`  | Shipping instructions for the line item (e.g., 'DELIVER IN PERSON').                                                                      |
| `L_SHIPMODE`      | `string`  | Shipping mode for the line item (e.g., 'AIR', 'TRUCK', 'MAIL').                                                                           |
| `L_COMMENT`       | `string`  | Miscellaneous comments about the line item.                                                                                               |

**Unique Properties:**

*   `L_ORDERKEY`, `L_LINENUMBER`: The combination of these two columns forms a composite primary key for the `LINEITEM` table. Each pair uniquely identifies a line item within an order.

**Primary Key:**

*   This table uses a composite primary key: (`L_ORDERKEY`, `L_LINENUMBER`).

**Example PyDough Queries:**

1.  Find line items for order key 1000 where the discount was greater than 0.05 (stored as 5):
    ```python
    LINEITEM.query("L_ORDERKEY == 1000 and L_DISCOUNT > 5")
    ```
2.  Select part key, quantity, and extended price for line items shipped before '1992-03-15' with return flag 'R':
    ```python
    LINEITEM.select("L_PARTKEY", "L_QUANTITY", "L_EXTENDEDPRICE").query("L_SHIPDATE < '1992-03-15' and L_RETURNFLAG == 'R'")
    ```
3.  Find line items shipped via 'AIR' with a quantity greater than 30:
    ```python
    LINEITEM.query("L_SHIPMODE == 'AIR' and L_QUANTITY > 30")
    ```

---