const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:id', async (req, res) => {
    try {
        const entityId = req.params.id;
        
        if (!entityId) {
            return res.status(400).json({ error: 'Entity ID is required' });
        }

        const sparqlQuery = `
PREFIX wd: <https://medievalcharterskg.wikibase.cloud/entity/>       # Your entities
PREFIX wdt: <https://medievalcharterskg.wikibase.cloud/prop/direct/> # Your direct properties
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

# Wikidata-specific prefixes for federated query
PREFIX wdref: <http://www.wikidata.org/entity/>
PREFIX wdtref: <http://www.wikidata.org/prop/direct/>

SELECT ?propertyLabel ?valueLabel ?instanceOfLabel ?residenceLabel ?coord WHERE {
  # Main entity data
  wd:${entityId} ?p ?value .
  ?property wikibase:directClaim ?p .

  # Optional: instance of
  OPTIONAL { wd:${entityId} wdt:P3 ?instanceOf }

  # Optional: residence + Wikidata coordinates
  OPTIONAL {
    wd:${entityId} wdt:P55 ?residence .
    ?residence wdt:P2 ?residenceWD .

    BIND(IRI(CONCAT("http://www.wikidata.org/entity/", ?residenceWD)) AS ?wdResidence)

    SERVICE <https://query.wikidata.org/sparql> {
      OPTIONAL {
        ?wdResidence wdtref:P625 ?coord .
      }
    }
  }

  # Labels
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" .
  }
}`;

        const response = await axios.post('https://medievalcharterskg.wikibase.cloud/query/sparql', 
            `query=${encodeURIComponent(sparqlQuery)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching entity properties:', error);
        res.status(500).json({ 
            error: 'Failed to fetch entity properties',
            details: error.message 
        });
    }
});

module.exports = router; 