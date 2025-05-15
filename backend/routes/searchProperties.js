const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:entityId', async (req, res) => {
    try {
        const { entityId } = req.params;
        
        const sparqlQuery = `
PREFIX wd: <https://medievalcharterskg.wikibase.cloud/entity/>       # Your entities
PREFIX wdt: <https://medievalcharterskg.wikibase.cloud/prop/direct/> # Your direct properties
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

# Wikidata-specific prefixes for federated query
PREFIX wdref: <http://www.wikidata.org/entity/>
PREFIX wdtref: <http://www.wikidata.org/prop/direct/>

SELECT ?propertyLabel ?valueLabel ?instanceOfLabel ?residenceLabel ?coord ?placeCoord WHERE {
  # Main entity data
  wd:${entityId} ?p ?value .
  ?property wikibase:directClaim ?p .

  # Optional: instance of
  OPTIONAL { wd:${entityId} wdt:P3 ?instanceOf }

  # Optional: residence + coordinates from Wikidata
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

  # Optional: check if the main entity is a place with a Wikidata ID via P2
  OPTIONAL {
    wd:${entityId} wdt:P2 ?placeWD .
    BIND(IRI(CONCAT("http://www.wikidata.org/entity/", ?placeWD)) AS ?wdPlace)

    SERVICE <https://query.wikidata.org/sparql> {
      OPTIONAL {
        ?wdPlace wdtref:P625 ?placeCoord .
      }
    }
  }

  # Labels
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" .
  }
}`;

        const response = await axios.get(process.env.WIKIBASE_SPARQL_URL, {
            params: {
                query: sparqlQuery,
                format: 'json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Error fetching properties' });
    }
});

module.exports = router; 