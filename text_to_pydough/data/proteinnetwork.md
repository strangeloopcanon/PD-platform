# Database Documentation: ProteinNetwork

## Summary

The `ProteinNetwork` database stores information about protein interactions. It primarily focuses on detailing the links between proteins and the evidence supporting these interactions, derived from various experimental and computational methods. This database is crucial for researchers studying protein functions, pathways, and complex biological systems.

Currently, the database contains the following collection:

-   `protein_links`: Details interactions between pairs of proteins and associated confidence scores.

---

## Collection: `protein_links`

### Description

The `protein_links` collection stores data on interactions or functional links between pairs of proteins. Each record represents a potential link between two proteins (`protein1` and `protein2`) and includes various scores that quantify the evidence for this link from different sources. These sources range from genomic context (e.g., neighborhood, fusion) to experimental data, co-expression, and text mining. A `combined_score` provides an overall confidence level for each interaction.

### Columns

| Column Name                 | Data Type | Description                                                                                                |
| :-------------------------- | :-------- | :--------------------------------------------------------------------------------------------------------- |
| `protein1`                  | `string`  | Identifier for the first protein in the interacting pair.                                                  |
| `protein2`                  | `string`  | Identifier for the second protein in the interacting pair.                                                 |
| `neighborhood`              | `float64` | Score indicating interaction likelihood based on conservation of gene neighborhood.                        |
| `neighborhood_transferred`  | `float64` | Score indicating interaction likelihood based on transferred gene neighborhood evidence from other organisms. |
| `fusion`                    | `float64` | Score indicating interaction likelihood based on gene fusion events.                                       |
| `cooccurence`               | `float64` | Score indicating interaction likelihood based on phylogenetic co-occurrence profiles.                      |
| `homology`                  | `float64` | Score indicating interaction likelihood based on homology (shared ancestry).                               |
| `coexpression`              | `float64` | Score indicating interaction likelihood based on observed gene co-expression patterns.                     |
| `coexpression_transferred`  | `float64` | Score indicating interaction likelihood based on transferred co-expression evidence from other organisms.    |
| `experiments`               | `float64` | Score indicating interaction likelihood based on direct experimental evidence of interaction.              |
| `experiments_transferred`   | `float64` | Score indicating interaction likelihood based on transferred experimental evidence from other organisms.   |
| `database`                  | `float64` | Score indicating interaction likelihood based on curated knowledge in biological databases.                |
| `database_transferred`      | `float64` | Score indicating interaction likelihood based on transferred database annotations from other organisms.    |
| `textmining`                | `float64` | Score indicating interaction likelihood based on co-mention in scientific literature (text mining).        |
| `textmining_transferred`    | `float64` | Score indicating interaction likelihood based on transferred text mining evidence from other organisms.    |
| `combined_score`            | `float64` | An overall confidence score for the interaction, integrating evidence from all available sources.          |

### Unique Properties

-   `protein1`
-   `protein2`

**Explanation:**
The combination of `protein1` and `protein2` uniquely identifies each record in this collection. This means that for any given pair of proteins, there will be at most one entry describing their interaction and associated scores. This implies that the order of `protein1` and `protein2` matters for uniqueness, or that data is pre-processed to ensure a canonical order (e.g., lexicographical) before insertion.

### Primary Key Notes

The `unique_properties` (`protein1`, `protein2`) together form a composite primary key for the `protein_links` table. This ensures that each distinct pair of interacting proteins has only one entry detailing their interaction scores.

### Example PyDough Queries

1.  **Find all interactions for a specific protein (e.g., 'P53_HUMAN') with a combined score greater than 0.7:**
    ```python
    # Assuming 'protein_links' is the PyDough object for the collection
    results = protein_links.query(
        (protein_links.protein1 == 'P53_HUMAN') | (protein_links.protein2 == 'P53_HUMAN'),
        protein_links.combined_score > 0.7
    ).select(
        protein_links.protein1,
        protein_links.protein2,
        protein_links.combined_score
    )
    ```

2.  **Retrieve the top 10 protein pairs with the highest `experiments` score:**
    ```python
    results = protein_links.query().order_by(
        protein_links.experiments.desc()
    ).limit(10).select(
        protein_links.protein1,
        protein_links.protein2,
        protein_links.experiments,
        protein_links.combined_score
    )
    ```

3.  **Find interactions where both `textmining` and `coexpression` scores are above 0.5:**
    ```python
    results = protein_links.query(
        protein_links.textmining > 0.5,
        protein_links.coexpression > 0.5
    ).select(
        protein_links.protein1,
        protein_links.protein2,
        protein_links.textmining,
        protein_links.coexpression,
        protein_links.combined_score
    )
    ```

---