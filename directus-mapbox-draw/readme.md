# Location module with Mapbox

A shape draw and display tool for the headless CMS Directus.

DNL is "Den Norske Los", a supplement to navigation for sea vessels in Norway.
This is a tool for Directus to enable you to set position, draw polygons,
speedsearch for places in Norway etc.

The goal is to take the input geometry, convert it to the mapbox format, but to
write back to the database in the format it came.

## Requirements

* Directus - https://getdirectus.com/
* Mapbox Token - (https://www.mapbox.com)

## Features

* Take input types and transform them to Mapbox universal format
* Deliver data back in the format it was input in if preferred

## Accepted object Types for input

### Feature Collection Input
Type: TEXT, JSON, VARCHAR
~~~~
{
    "features":[
        {
            "id":"primary",
            "type":"Feature",
            "properties":{
                "primary":true
            },
            "geometry":{
                "coordinates":[6.5787,58.2247],
                "type":"Point"
            }
        },
        {
            "id":"cf592981807b3d6e74e2b2f196bc1674",
            "type":"Feature",
            "properties":{},
            "geometry":{
                "coordinates":[
                    [
                        [6.613032275574454,58.25216945960756],
                        [6.2147778810342515,58.34886579013707],
                        [6.038996631039737,58.3992737891615],
                        [6.0307568849430595,58.41941683022279],
                        [5.940119677911866,58.39783455985773],
                        [6.1186475099456175,58.307044586694786],
                        [6.423518115415334,58.2304848120375],
                        [6.538874560725901,58.18417990536025],
                        [6.613032275574454,58.25216945960756]
                    ]
                ],
                "type":"Polygon"
            }
        }
    ],
    "type": "FeatureCollection"
}
~~~~

### Point Input
Type: TEXT, JSON, VARCHAR

~~~~
{
    "type":"Point",
    "coordinates":[
        5.838890075683595,
        58.9328326364999
    ]
}
~~~~

### LineString Input
Type: TEXT, JSON, VARCHAR

Decimal degrees
~~~~
{
    "type":"LineString",
    "coordinates":[
        [5.838890075683595,58.9328326364999],
        [5.838890075683595,58.9328326364999],
        [5.838890075683595,58.9328326364999],
        [5.838890075683595,58.9328326364999]    
    ]
}
~~~~

Spatial reference (UTM32 so far)
~~~~
{
    "type": "LineString",
    "coordinates": [
        [311865.03,6541584.29],
        [311863.2,6541590.16],
        [311861.72000000003,6541594.890000001],
        [311860.09,6541600.12],
        [311857.3,6541608.86],
        [311854.98,6541616.3],
        [311833.54,6541684.22]
    ]
}
~~~~

### Polygon Input
Type: TEXT, JSON, VARCHAR

~~~~
{
    "type": "Polygon",
    "coordinates": [
        [
            [
                5.63,
                59.14                
            ],      
            [
                5.635,
                59.15
            ]
        ]
    ]
}
~~~~


## Object types for the map / draw object

~~~~
{
    "features": [
        {
            "geometry": {
                "type": "Point",
                "coordinates": [
                    lng,
                    lat
                ]
            },
            "type": "Feature"
        },
        {
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [lng,lat],
                    [lng,lat],
                    [lng,lat],
                    [lng,lat]
                ]
            },
            "type": "Feature"
        },
        {
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [lng,lat],
                    [lng,lat],
                    [lng,lat],
                    [lng,lat]
                ]
            },
            "type": "Feature"
        }
    ],
    "type": "FeatureCollection"
}
~~~~
