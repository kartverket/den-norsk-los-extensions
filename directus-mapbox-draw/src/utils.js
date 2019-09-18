import proj4 from 'proj4';

function coordinateConversion(coordinates,projection,zone){
    console.log('coordinates: ',coordinates);
    let convertedResult = proj4('+proj='+projection+' +zone='+zone+' +ellps=WGS84 +datum=WGS84 +units=m +no_defs','+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees', coordinates);
    console.log(' testResult: ',convertedResult);
    const floatedLng = parseFloat(convertedResult[0]);
    const floatedLat = parseFloat(convertedResult[1]);

    return [floatedLng,floatedLat];

}

export function geoReviver(type,val){
    if(type == "geometry"){
        return val;
    } else if(type == "type"){
        return undefined;
    } else {
        return val;
    }
}

const preFormattedCollectionStart = '{"type":"FeatureCollection","features": [';
const preFormattedCollectionEnd = ']}';
const preFormattedGeometryStart = '{"type": "Feature","properties": {},"geometry":';
const preFormattedGeometryStartMain = '{"id":"primary","type": "Feature","properties": {},"geometry":';
const preFormattedGeometryEnd = '}';

export function geometryParser(geoObject){
    console.log('geometryParser: ',geoObject);

    let objectType = geoObject.type;
    let actualSize = 0;
    let coordinateRoot = geoObject.coordinates;

    if(objectType === "FeatureCollection"){
        actualSize = geoObject.features.length;
        coordinateRoot = geoObject.features[0].geometry.coordinates;
    } else if(objectType === "GeometryCollection"){
        actualSize = geoObject.geometries.length;
    } else if(objectType === "Point" || objectType === "LineString" || objectType === "Polygon"){
        actualSize = 1;
    }
    console.log(coordinateRoot);

    let processedGeoObject = "";

    // One object only
    if(actualSize === 1){
        let geoType = "";
        if(objectType === "FeatureCollection"){
            geoType = geoObject.features[0].geometry.type;
        } else {
            geoType = geoObject.type;
        }

        // Check how many numbers before period, if more than two we can assume it is not 58.8333 formats
        let coordinateType = parseFloat(coordinateRoot[0].toString().split(".")[0].length);
        let formattedLatLng = [];

        if(coordinateType > 2 && geoType === "Point"){
            formattedLatLng = coordinateConversion(coordinateRoot,'utm',32);
            console.log('formattedlatlng: ',formattedLatLng);
        } else if((coordinateType > 2 && geoType === "LineString") || (coordinateType > 2 && geoType === "Polygon")){

            formattedLatLng.length = coordinateRoot.length;
            console.log('after length',formattedLatLng);
            console.log('LineString');
            for(let c = 0; c < coordinateRoot.length; c++){
                let convertedCoords = coordinateConversion(coordinateRoot[c],'utm',32);
                console.log('convertedCoords ',convertedCoords);
                formattedLatLng[c] = [parseFloat(convertedCoords[0]),parseFloat(convertedCoords[1])];
            }
            console.log('afterloop ',formattedLatLng);
        } else if((coordinateType <= 2 && geoType === "LineString") || (coordinateType <= 2 && geoType === "Polygon")){
            formattedLatLng.length = coordinateRoot.length;
            for(let c = 0; c < coordinateRoot.length; c++){
                let convertedCoords = coordinateRoot[c];
                console.log('convertedCoords ',convertedCoords);
                formattedLatLng[c] = [parseFloat(convertedCoords[0]),parseFloat(convertedCoords[1])];
            }
        } else {
            console.log('else',)
            formattedLatLng = [parseFloat(coordinateRoot[0]),parseFloat(coordinateRoot[1])];
        }

        if(geoType === "Point"){
            console.log('pntfrmt',formattedLatLng);
            processedGeoObject = processedGeoObject + preFormattedGeometryStartMain + '{"type": "Point","coordinates": ['+formattedLatLng+']}' + preFormattedGeometryEnd;
            console.log(processedGeoObject);

        } else if(geoType === "LineString"){

            let stringLineObject = [];
            for(let f = 0; f < formattedLatLng.length; f++){
                if(f !== formattedLatLng.length - 1){
                    stringLineObject.push('['+formattedLatLng[f]+']');
                } else {
                    stringLineObject.push('['+formattedLatLng[f]+']');
                }
            }
            processedGeoObject = processedGeoObject + preFormattedGeometryStart + '{"type": "LineString","coordinates": ['+stringLineObject+']}' + preFormattedGeometryEnd;
            console.log('processedGeoObject line ',processedGeoObject);

        } else if(geoType === "Polygon"){

            let stringPolyObject = [];
            for(let p = 0; p < formattedLatLng.length; p++){
                if(p !== formattedLatLng.length - 1){
                    stringPolyObject.push('['+formattedLatLng[p]+']');
                } else {
                    stringPolyObject.push('['+formattedLatLng[p]+']');
                }
            }
            processedGeoObject = processedGeoObject + preFormattedGeometryStart + '{"type": "Polygon","coordinates": ['+stringPolyObject+']}' + preFormattedGeometryEnd;
            console.log('processedGeoObject poly ',processedGeoObject);
        }

    // Multiple objects
    } else if(actualSize > 1){
        if(objectType === "FeatureCollection"){

            if(geoObject.features && geoObject.features.length === 1 && geoObject.features[0].geometry.type === "Point"){
                console.log('Inside if');
                let formattedLatLng = [];
                let coordinateType = parseFloat(geoObject.features[0].geometry.coordinates[0].toString().split(".")[0].length);

                if(coordinateType > 2){
                    formattedLatLng = coordinateConversion(geoObject.features[0].geometry.coordinates,'utm',32);
                } else {
                    formattedLatLng = [geoObject.features[0].geometry.coordinates[0],geoObject.features[0].geometry.coordinates[1]];
                }

                processedGeoObject = processedGeoObject + preFormattedGeometryStart + '{"type": "Point","coordinates": ['+parseFloat(formattedLatLng[0])+','+parseFloat(formattedLatLng[1])+']}' + preFormattedGeometryEnd;

            } else if(geoObject.features && geoObject.features.length > 1 && geoObject.features[0].geometry.type === "Point"){
                console.log('Inside if more than one feature');
                let formattedLatLng = [];

                for(let g = 0; g < geoObject.features.length; g++){

                    let coordinateType = parseFloat(geoObject.features[g].geometry.coordinates[0].toString().split(".")[0].length);
                    let objectType = geoObject.features[g].geometry.type;
                    let objectId = geoObject.features[g].geometry.id;
                    console.log('Loop: ',objectType,objectId,coordinateType);

                    if(coordinateType > 2){
                        if(objectType === "Point"){
                            formattedLatLng = coordinateConversion(geoObject.features[g].geometry.coordinates,'utm',32);
                        } else {
                            formattedLatLng = geoObject.features[g].geometry.coordinates;
                            // formattedLatLng.length = geoObject.features[g].geometry.coordinates[0].length;
                            // console.log('after length',formattedLatLng);
                            console.log('LineString or Polygon');
                            for(let c = 0; c < geoObject.features[g].geometry.coordinates.length; c++){
                                let convertedCoords = geoObject.features[g].geometry.coordinates[c];
                                console.log('convertedCoords ',convertedCoords);
                                formattedLatLng[c] = [parseFloat(coordinateConversion(convertedCoords[0],'utm',32)),parseFloat(coordinateConversion(convertedCoords[1],'utm',32))];
                            }
                        }

                    } else {
                        if(objectType === "Point"){
                            formattedLatLng = [geoObject.features[g].geometry.coordinates[0],geoObject.features[g].geometry.coordinates[1]];
                        } else {
                            formattedLatLng = geoObject.features[g].geometry.coordinates;
                            // formattedLatLng.length = geoObject.features[g].geometry.coordinates[0].length;
                            // console.log('after length',formattedLatLng);
                            console.log('LineString or Polygon',geoObject.features[g].geometry.coordinates);
                            for(let c = 0; c < geoObject.features[g].geometry.coordinates.length; c++){
                                let convertedCoords = geoObject.features[g].geometry.coordinates[c];
                                console.log('convertedCoords ',convertedCoords);
                                formattedLatLng[c] = [parseFloat(convertedCoords[0]),parseFloat(convertedCoords[1])];
                            }

                            // formattedLatLng = [geoObject.features[g].geometry.coordinates[0],geoObject.features[g].geometry.coordinates[1]];
                        }
                    }

                    if(objectType === "Point"){

                        processedGeoObject = processedGeoObject + preFormattedGeometryStart + '{"type": "Point","coordinates": ['+parseFloat(formattedLatLng[0])+','+parseFloat(formattedLatLng[1])+']}' + preFormattedGeometryEnd;

                    } else if(objectType === "LineString"){
                        console.log('line formattedLatLng: ',formattedLatLng);
                        let stringLineObject = [];
                        for(let pl = 0; pl < formattedLatLng.length; pl++){
                            if(pl !== formattedLatLng.length - 1){
                                stringLineObject.push('['+formattedLatLng[pl]+']');
                            } else {
                                stringLineObject.push('['+formattedLatLng[pl]+']');
                            }
                        }
                        processedGeoObject = processedGeoObject + preFormattedGeometryStart + '{"type": "LineString","coordinates": ['+stringLineObject+']}' + preFormattedGeometryEnd;
                        console.log('processedGeoObject line ',processedGeoObject);
                    } else if(objectType === "Polygon"){
                        console.log('poly formattedLatLng: ',formattedLatLng);

                        let stringPolyObject = [];
                        for(let pl = 0; pl < formattedLatLng.length; pl++){
                            if(pl !== formattedLatLng.length - 1){
                                stringPolyObject.push('['+formattedLatLng[pl]+']');
                            } else {
                                stringPolyObject.push('['+formattedLatLng[pl]+']');
                            }
                        }
                        processedGeoObject = processedGeoObject + preFormattedGeometryStart + '{"type": "Polygon","coordinates": ['+stringPolyObject+']}' + preFormattedGeometryEnd;
                        console.log('processedGeoObject poly ',processedGeoObject);

                    }


                    if(g < geoObject.features.length - 1){
                        processedGeoObject = processedGeoObject + ',';
                    }


                }



            }
        }


    }
    console.log('objectType: ',objectType,'actualSize: ',actualSize);

    return preFormattedCollectionStart+processedGeoObject+preFormattedCollectionEnd;

}

export function getCenterPoint(geoObject){
    console.log('Get center point',geoObject);
}

// Function to convert polygons or a set of points to a square area we
// can pan the map to (bbox)
export function bboxFromArray(bigArray){

    let i = 0;
    let j = 0;
    let smallestLon = 0;
    let biggestLon = 0;
    let smallestLat = 0;
    let biggestLat = 0;
    let bbox = [];

    for(i; i < bigArray.length; i++){
        let currentValue = parseFloat(bigArray[i][0]);
        let biggestValue = parseFloat(biggestLon);
        let smallestValue = parseFloat(smallestLon);

        if(smallestValue === 0 || currentValue < smallestValue){

            smallestLon = currentValue;
        }

        if(currentValue > biggestValue){

            biggestLon = currentValue;
        }

    }

    for(j; j < bigArray.length; j++){
        let currentValue = parseFloat(bigArray[j][1]);
        let biggestValue = parseFloat(biggestLat);
        let smallestValue = parseFloat(smallestLat);

        if(smallestValue === 0 || currentValue < smallestValue){

            smallestLat = currentValue;
        }

        if(currentValue > biggestValue){
            biggestLat = currentValue;
        }
    }

    bbox.push([smallestLon,smallestLat]);
    bbox.push([biggestLon,biggestLat]);

    return bbox;
}
