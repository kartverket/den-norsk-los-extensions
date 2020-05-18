<template>
  <div class="interface-mapbox-draw">
    <div class="map-area">
      <div :class="{ 'map-readonly': readonly }" class="map">
        <div class="map-container" id="directusMap" :style="{ height: options.height + 'px' }">
          <!-- Map Renders Here -->
        </div>
      </div>
    </div>
    <div class="map-actions">
      <div class="ssr-search-container">
        <v-input
          type="text"
          icon-right-color
          id="ssrSearch"
          :value="placeName || ''"
          :readonly="readonly"
          :placeholder="options.placeholder"
          :icon-left="options.iconLeft"
          :icon-right="options.iconRight"
          :charactercount="options.showCharacterCount"
          v-model="placeName"
          @input="readInput"
        ></v-input>
        <ul class="placename-list" v-if="placenames && placenames.length > 0">
          <li
            v-for="placename in placenames"
            :key="placename.id"
            @click="updateValueSSR(placename.label + placename.value)"
          >{{placename.label + placename.value}}</li>
        </ul>
      </div>
    </div>

    <div class="map-details">
      <div class="map-location">
        <span v-if="latlng">
          Latitude:
          <b>{{ latlng.lat }}</b>
        </span>
        <span v-if="latlng">
          Longitude:
          <b>{{ latlng.lng }}</b>
        </span>
      </div>
      <button v-if="isInteractive && latlng" class="map-save" @click="setValue(value)">{{ 'Save' }}</button>
      <button v-if="isInteractive && latlng" class="map-clear" @click="setValue()">{{ $t("clear") }}</button>
    </div>
  </div>
</template>

<script>
import mixin from "@directus/extension-toolkit/mixins/interface";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { parseString } from "xml2js";
import { geoReviver, geometryParser, bboxFromArray } from "./utils";
import mapStyle from "./style.json";
import "./style.css";

var drawOptions = {
  displayControlsDefault: false,
  controls: {
    point: true,
    line_string: true,
    polygon: true,
    trash: true
  },
  styles: [
    {
      id: "dnl-active-points",
      type: "circle",
      filter: [
        "all",
        ["==", "$type", "Point"],
        ["==", "meta", "feature"],
        ["==", "active", "true"]
      ],
      paint: {
        "circle-radius": 11,
        "circle-color": "#25A650",
        "circle-stroke-width": 5,
        "circle-stroke-color": "#25A650",
        "circle-stroke-opacity": 0.2
      }
    },
    {
      id: "dnl-inactive-points",
      type: "circle",
      filter: [
        "all",
        ["==", "$type", "Point"],
        ["==", "meta", "feature"],
        ["==", "active", "false"]
      ],
      paint: {
        "circle-radius": 8,
        "circle-color": "#25A650"
      }
    },
    // ACTIVE (being drawn)
    // line stroke
    {
      id: "dnl-gl-draw-line",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#25A650",
        "line-dasharray": [0.2, 1.2],
        "line-width": 5
      }
    },
    // polygon fill
    {
      id: "dnl-gl-draw-polygon-fill",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
      paint: {
        "fill-color": "#25A650",
        "fill-outline-color": "#25A650",
        "fill-opacity": 0.2
      }
    },
    // polygon outline stroke
    // This doesn't style the first edge of the polygon, which uses the line stroke styling instead
    {
      id: "dnl-gl-draw-polygon-stroke-active",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#25A650",
        "line-dasharray": [0.2, 2],
        "line-width": 5
      }
    },
    // vertex point halos
    {
      id: "dnl-gl-draw-polygon-and-line-vertex-halo-active",
      type: "circle",
      filter: [
        "all",
        ["==", "meta", "vertex"],
        ["==", "$type", "Point"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "circle-radius": 7,
        "circle-color": "#FFF"
      }
    },
    // vertex points
    {
      id: "dnl-gl-draw-polygon-and-line-vertex-active",
      type: "circle",
      filter: [
        "all",
        ["==", "meta", "vertex"],
        ["==", "$type", "Point"],
        ["!=", "mode", "static"]
      ],
      paint: {
        "circle-radius": 5,
        "circle-color": "#25A650"
      }
    },

    // INACTIVE (static, already drawn)
    // line stroke
    {
      id: "dnl-gl-draw-line-static",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["==", "mode", "static"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#25A650",
        "line-width": 5
      }
    },
    // polygon fill
    {
      id: "dnl-gl-draw-polygon-fill-static",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
      paint: {
        "fill-color": "#25A650",
        "fill-outline-color": "#25A650",
        "fill-opacity": 0.2
      }
    },
    // polygon outline
    {
      id: "dnl-gl-draw-polygon-stroke-static",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#25A650",
        "line-width": 5
      }
    }
  ]
};

export default {
  name: "interface-mapbox-draw",
  mixins: [mixin],
  data() {
    return {
      test: null,
      map: null,
      draw: null,
      marker: null,
      latlng: null,
      storedFeatures: null,
      geometryObject: null,
      isLocating: false,
      placeName: "",
      mapPlaceholder: "directusMap",
      mapInteractions: [
        "boxZoom",
        "doubleClickZoom",
        "dragging",
        "keyboard",
        "scrollWheelZoom",
        "tap",
        "touchZoom"
      ]
    };
  },
  mounted() {
    this.init();
  },
  watch: {
    "options.theme"(newVal) {
      // console.log("Theme new value");
      // mapboxgl.tileLayer(newVal).addTo(this.map);
    },

    readonly(status) {
      this.toggleMapInteractions(!status);

      if (status) {
        this.unbindMapEvents();
      } else {
        this.bindMapEvents();
      }
    }
  },
  computed: {
    isInteractive() {
      return !this.readonly;
    }
  },
  methods: {
    init() {
      /*
       *   On init we have to check what kind of object we get and figure out how to
       *   set map center on it. We always center on a point if we have one.
       */

      let pointArray = [];
      let geoObject;
      let parsedGeoObject;

      if (this.value) {
        // console.log("init(): We have value, check it.");
        let pointData = this.value;

        if (pointData) {
          // console.log("init(): This? ", this.fields.id.id, " - ", this);
          // console.log("init(): Send value to geometryParser ", this.value);

          parsedGeoObject = JSON.parse(geometryParser(this.value));
          // console.log("Parsed ok");
          // geoObject = JSON.parse(this.getGeoObject(pointData));
        }
      } else {
      }

      // console.log("We have geoobject: ", parsedGeoObject);

      if (parsedGeoObject) {
        // console.log(
        //   "init(): Create map. This is the object we got parsed: ",
        //   parsedGeoObject
        // );
        setTimeout(this.createMap, 2500, parsedGeoObject);
        // this.createMap(parsedGeoObject);
      } else {
        console.log(
          "init(): No geometry, insert error, create defaults, val: ",
          this.value
        );
        const defaultCollection = JSON.parse(
          '{"type":"FeatureCollection","features":[{"geometry":{"coordinates":[' +
            this.options.mapLng +
            "," +
            this.options.mapLat +
            '],"type":"Point"},"properties":{},"type":"Feature"}]}'
        );

        setTimeout(this.createMap, 2500, defaultCollection);
      }
    },
    updateValueSSR(valueSSR) {
      // console.log("valueSSR: ", valueSSR);
      const stringArray = valueSSR.split(" - ");
      let unformattedLat = stringArray[2].split(", ")[0];
      let unformattedLng = stringArray[2].split(", ")[1];
      // console.log(
      //   "unformattedLat",
      //   unformattedLat,
      //   "unformattedLng",
      //   unformattedLng
      // );

      const ssrLat = parseFloat(unformattedLat);
      const ssrLng = parseFloat(unformattedLng);

      // console.log("ssrLat: ", ssrLat, " ssrLng: ", ssrLng);

      // console.log(
      //   "TODO: Oppdater punktet også hvis det eksisterer,lukk modal etterpå"
      // );
      const feature = {
        id: this.storedFeatures[0],
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [ssrLng, ssrLat] }
      };

      this.draw.add(feature);
      this.map.flyTo({
        center: [ssrLng, ssrLat]
      });

      this.updateValue(this.draw.getAll());

      // Clear placenames
      this.placenames = [];
    },

    updateValue(rawValue) {
      // console.log("updateValue:", rawValue);
      let value = rawValue;

      if (value.length > 2 && this.placename === "") {
        this.getPlacenames();
      } else if (value.length < 2) {
        this.placename = "";
      }

      // if (this.options.trim) {
      //   if (!this.value || value.length > this.value.length) {
      //     value = value.trim();
      //   }
      // }
      this.$emit("input", value);
    },
    readInput() {
      let query = this.placeName.trim();
      // console.log(query);
      const commaCheck = query.indexOf(",");
      const degreeCheck = query.indexOf("°");

      // Refactor into own function once functionality is decided, need to know what input formats we want to support
      if(commaCheck !== -1){
        const periodCheck = query.indexOf(".");
        // console.log('periodCheck: ',periodCheck);

        if(periodCheck === 2){
          const latString = query.split(",")[0];
          const lngString = query.split(",")[1];

          // console.log(latString,' - ',lngString);

          const feature = {
              id: this.storedFeatures[0],
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [parseFloat(lngString), parseFloat(latString)]
              }
            };

            this.draw.add(feature);

            this.map.flyTo({
              center: [parseFloat(lngString), parseFloat(latString)]
            });

            this.updateValue(this.draw.getAll());
        }

      } else if (degreeCheck !== -1) {
        // console.log("Read input if");

        const latCheckN = query.indexOf("N"),
          latCheckS = query.indexOf("S"),
          lngCheckE = query.indexOf("E"),
          lngCheckENo = query.indexOf("Ø"),
          lngCheckW = query.indexOf("W"),
          lngCheckWNo = query.indexOf("V");

        let locationArray, lat;

        if (latCheckN !== -1) {
          locationArray = query.split("N");

          lat = locationArray[0];
          if (lat === "") {
            // console.log("N is in front of latitude", locationArray);
            lat = locationArray[1];
            lat = lat.replace(/\s/g, "");
          } else {
            lat = lat.replace(/\s/g, "");
          }
        } else if (latCheckS !== -1) {
          locationArray = query.split("S");
          lat = locationArray[0];
          lat = lat.replace(/\s/g, "");
        }

        // console.log(lat, latCheckN);

        const latDegree = lat.split("°");

        // Get minute by checking for comma or apostrophe
        let latMinute = "";
        if (latDegree[1].indexOf(",")) {
          latMinute = latDegree[1].split(",");
        } else if (latDegree[1].indexOf('"')) {
          latMinute = latDegree[1].split('"');
        } else if (latDegree[1].indexOf(".")) {
          latMinute = latDegree[1].split(".");
        }
        // console.log(latMinute);
        let latSecond = "";
        let latFraction = 0;
        if (latMinute.length === 1) {
          if (latMinute[0].indexOf("’")) {
            latSecond = latMinute[0].split("’");
          } else if (latMinute[0].indexOf("'")) {
            latSecond = latMinute[0].split("'");
          } else if (latMinute[0].indexOf("′")) {
            latSecond = latMinute[0].split("′");
          }
          latFraction = parseInt(latMinute[0] / 60);
          latFraction = latFraction + parseInt(latDegree[0]);
          latFraction = latFraction + parseFloat(latSecond[0] / 3600);
        } else {
          if (latMinute[1].indexOf("’")) {
            latSecond = latMinute[1].split("’");
          } else if (latMinute[1].indexOf("'")) {
            latSecond = latMinute[1].split("'");
          } else if (latMinute[1].indexOf("′")) {
            latSecond = latMinute[0].split("′");
          }

          latFraction = parseInt(latMinute[0] / 60);
          latFraction = latFraction + parseInt(latDegree[0]);
          latFraction = latFraction + parseFloat(latSecond[0] / 3600);
        }

        // console.log('Lat: ' + latFraction.toFixed(4));

        let lng = locationArray[1];
        lng = lng.replace(/\s/g, "");

        let locationArrayLng, longitude;

        if (lngCheckE !== -1) {
          locationArrayLng = lng.split("E");
          longitude = locationArrayLng[0];
          if (longitude === "") {
            longitude = locationArrayLng[1];
            longitude = longitude.replace(/\s/g, "");
          } else {
            longitude = longitude.replace(/\s/g, "");
          }
        } else if (lngCheckENo !== -1) {
          locationArrayLng = lng.split("Ø");
          longitude = locationArrayLng[0];
          longitude = longitude.replace(/\s/g, "");
        } else if (lngCheckW !== -1) {
          locationArrayLng = lng.split("W");
          longitude = locationArrayLng[0];
          longitude = longitude.replace(/\s/g, "");
        } else if (lngCheckWNo !== -1) {
          locationArrayLng = lng.split("V");
          longitude = locationArrayLng[0];
          longitude = longitude.replace(/\s/g, "");
        }

        const lngDegree = longitude.split("°");

        let lngMinute = "";
        // Get minute by checking for comma or apostrophe
        if (lngDegree[1].indexOf(",")) {
          lngMinute = lngDegree[1].split(",");
        } else if (lngDegree[1].indexOf('"')) {
          lngMinute = lngDegree[1].split('"');
        }

        let lngSecond = "";
        if (lngMinute[1].indexOf("’")) {
          lngSecond = lngMinute[1].split("’");
        } else if (lngMinute[1].indexOf("'")) {
          lngSecond = lngMinute[1].split("'");
        }

        let lngFraction = lngMinute[0] / 60;
        lngFraction = lngFraction + parseInt(lngDegree[0]);
        lngFraction = lngFraction + parseFloat(lngSecond[0] / 3600);

        // console.log('Lng: ' + lngFraction.toFixed(4));

        // Sanitize

        if (!isNaN(latFraction) && latFraction.toString().indexOf(".") != -1) {
          if (
            !isNaN(lngFraction) &&
            lngFraction.toString().indexOf(".") != -1
          ) {
            // Update point location
            // this.geoObject.features[0].geometry.coordinates = [lngFraction, latFraction];

            // map.getSource('point').setData(geojson);
            // console.log(this.draw.getAll());

            const feature = {
              id: this.storedFeatures[0],
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [lngFraction, latFraction]
              }
            };

            this.draw.add(feature);

            this.map.flyTo({
              center: [lngFraction, latFraction]
            });

            this.updateValue(this.draw.getAll());
          }
        }
      } else {
        console.log("Read input else");
        if (query.length > 2) {
          this.getNames();
        }
      }
    },

    async getNames() {
      let query = this.placeName.trim().toLowerCase();

      const isNum = /^\d+$/.test(query);
      // console.log('query: ',query,'isNum: ', isNum);

      let ssrResults = [];
      let resultLimit = 50;

      const confirmedPlace = ["Godkjent", "Vedtatt", "Historisk"];
      const unwantedPlace = [
        "Skogområde",
        "Landskapsområde",
        "Hei",
        "Bakke",
        "Li",
        "Stup",
        "Vidde",
        "Slette",
        "Mo",
        "Dalføre",
        "Dal",
        "Botn",
        "Senkning",
        "Skar",
        "Juv",
        "Søkk",
        "Stein",
        "Grotte",
        "Heller",
        "Terrengdetalj",
        "Bekk",
        "Grøft",
        "Foss",
        "Stryk",
        "Høl",
        "Lone",
        "Kilde",
        "Eid",
        "Fonn",
        "Elvemel",
        "Skog",
        "Myr",
        "Utmark",
        "Sva",
        "Ur",
        "Skred",
        "Øyr",
        "Sand",
        "Eng",
        "Jorde",
        "Havnehage",
        "Torvtak",
        "Setervoll",
        "Park",
        "Fyllplass",
        "Grustak/Steinbrudd",
        "Tømmervelte",
        "Boligfelt",
        "Hyttefelt",
        "Borettslag",
        "Industriområde",
        "Gard",
        "Bruk (gardsbruk)",
        "Enebolig/mindre boligbygg(villa)",
        "Boligblokk",
        "Fritidsbolig (hytte, sommerhus)",
        "Seter (sel, støl)",
        "Bygg for jordbr, fiske, fangst",
        "Barnehage",
        "Adressenavn",
        "Fengsel",
        "Museum/ Galleri/Bibliotek",
        "Garasje/hangarbygg",
        "Veg (Gate)",
        "Traktorveg",
        "Sti",
        "Jernbanestrekning",
        "Klopp",
        "Vad",
        "Tunnel",
        "Kryss (Veg/Gate)",
        "Vegbom",
        "Bomstasjon",
        "Grind",
        "Parkeringsplass",
        "Stasjon",
        "Holdeplass",
        "Rasteplass",
        "Busstopp",
        "Flyplass",
        "Landingsstripe",
        "Plass/torg",
        "Eiendommer",
        "Skytebane",
        "Gravplass",
        "Skiheis",
        "Fjellheis",
        "Slalåm- og utforbakke",
        "Fornøyelsespark",
        "Tømmerrenne",
        "Taubane",
        "Fløtningsannlegg",
        "Gammel bosettingsplass",
        "Offersted",
        "Utsiktspunkt",
        "Melkeplass",
        "Annen kulturdetalj",
        "Gjerde",
        "Stø",
        "Kirke"
      ];

      // console.log("getPlacenames:");

      try {
        // console.log('isNum: ',isNum);
        let response = "";

        if (isNum) {
          response = await fetch(
            "https://ws.geonorge.no/SKWS3Index/v2/ssr/sok?stedsnummer=" + 
            query + 
            "&epsgKode=4258&eksakteForst=true",
            {
              cache: "default",
              dataType: "xml"
            }
          );
        } else {
          response = await fetch(
            "https://ws.geonorge.no/SKWS3Index/v2/ssr/sok?navn=" +
              query +
              "*&epsgKode=4258&eksakteForst=true",
            {
              cache: "default",
              dataType: "xml"
            }
          );
        }

        if (response !== "") {
          const data = await response.text();
          parseString(data, function(err, result) {
            if (result) {
              // console.log(result,err);
              if (result.sokRes.stedsnavn) {
                if (result.sokRes.stedsnavn.length < resultLimit) {
                  resultLimit = result.sokRes.stedsnavn.length;
                }

                for (let r = 0; r < resultLimit; r++) {
                  let placeNameResults = {};

                  const placeName = result.sokRes.stedsnavn[r].stedsnavn[0];
                  const placeKommune =
                    result.sokRes.stedsnavn[r].kommunenavn[0];
                  const placeFylke = result.sokRes.stedsnavn[r].fylkesnavn[0];
                  let placeLat = result.sokRes.stedsnavn[r].nord[0];
                  let placeLng = result.sokRes.stedsnavn[r].aust[0];
                  const nameType = result.sokRes.stedsnavn[r].navnetype[0];
                  const placeNumber = result.sokRes.stedsnavn[r].stedsnummer[0];
                  const nameStatus =
                    result.sokRes.stedsnavn[r].skrivemaatestatus[0];

                  placeNameResults.id = r;

                  placeLat = parseFloat(placeLat).toFixed(4);
                  placeLng = parseFloat(placeLng).toFixed(4);

                  placeNameResults.label =
                    placeName +
                    ", " +
                    placeKommune +
                    ", " +
                    placeFylke +
                    " - " +
                    nameType +
                    " - ";
                  placeNameResults.value =
                    placeLat + ", " + placeLng + " - " + placeNumber;

                  const checkForUnwanted = unwantedPlace.indexOf(nameType);
                  const checkForConfirmed = confirmedPlace.indexOf(nameStatus);

                  if (checkForUnwanted === -1 && checkForConfirmed !== -1) {
                    ssrResults.push(placeNameResults);
                  }
                }
              }
            }
          });
          this.placenames = ssrResults;
        }
        // console.log("data: ", ssrResults);
      } catch (error) {
        console.error(error);
      }
    },

    createMap(geometry) {
      const that = this;
      // console.log("createMap: ", geometry);

      let mapCenter;

      if (geometry.features[0].geometry.coordinates.length > 2) {
        mapCenter = geometry.features[0].geometry.coordinates[0];
        // console.log('if',mapCenter);
      } else {
        mapCenter = geometry.features[0].geometry.coordinates;
        // console.log('else',mapCenter);
      }

      mapboxgl.accessToken =
        "pk.eyJ1Ijoia2hvbGx1bmQiLCJhIjoiY2l1cGg3NWhmMDAxajJ0b2VuMGJvbXJ3aiJ9.8ZpE-ALTM_i68abMSf-Olw";
      this.map = new mapboxgl.Map({
        container: this.mapPlaceholder,
        style: mapStyle,
        center: [mapCenter[0], mapCenter[1]],
        zoom: 14
      });

      // console.log(this.map,mapStyle);

      if (geometry.features.length > 1) {
        let routeBounds = [];

        for (let i = 0; i < geometry.features.length; i++) {
          if (geometry.features[i].geometry.coordinates.length > 2) {
            for (
              let j = 0;
              j < geometry.features[i].geometry.coordinates.length;
              j++
            ) {
              const boundLat = geometry.features[i].geometry.coordinates[j][1];
              const boundLng = geometry.features[i].geometry.coordinates[j][0];
              routeBounds.push([boundLng, boundLat]);
            }
          } else {
            const boundLat = geometry.features[i].geometry.coordinates[1];
            const boundLng = geometry.features[i].geometry.coordinates[0];
            routeBounds.push([boundLng, boundLat]);
          }
        }
        // console.log(this.props.coordinates[0],this.props.coordinates[1]);

        // routeBounds.push([
        //   this.props.coordinates[0],
        //   this.props.coordinates[1]
        // ]);

        const newBounds = bboxFromArray(routeBounds);
        // console.log("setbounds! ", newBounds);

        this.map.fitBounds(newBounds, {
          padding: { top: 5, bottom: 5, left: 50, right: 50 }
        });
      }

      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 80,
          unit: "metric"
        })
      );

      // console.log('After controls are added');

      this.draw = new MapboxDraw(drawOptions);

      // Map#addControl takes an optional second argument to set the position of the control.
      // If no position is specified the control defaults to `top-right`. See the docs
      // for more details: https://www.mapbox.com/mapbox-gl-js/api/map#addcontrol

      this.map.addControl(this.draw, "top-right");

      // console.log('draw added: ',draw);

      this.storedFeatures = this.draw.add(geometry);

      // console.log("Stored features: ", this.storedFeatures);

      // If someone draws an object, store it in the geo object
      this.map.on("draw.create", function(e) {
        // Drawn object
        // console.log("Drawn object:", e);

        let storedValue = JSON.stringify(that.value);

        // Stored object
        // console.log(that.storedFeatures, storedValue);

        if (storedValue) {
          storedValue = storedValue.replace(/ /g, "");
          let strippedContent = storedValue
            .split('{"features":[')[1]
            .split('],"type":"FeatureCollection"}')[0];

          let contentArray = strippedContent.split(',{"id":');

          let stringObject = JSON.stringify(e["features"][0]);
          // console.log(
          //   "contentArray: ",
          //   contentArray,
          //   " stringObject: ",
          //   stringObject
          // );

          contentArray.push(stringObject);

          if (contentArray.length > 1) {
            for (let i = 1; i < contentArray.length; i++) {
              if (
                i > 1 &&
                (i !== contentArray.length && contentArray.length !== 2)
              ) {
                contentArray[i - 1] = '{"id":' + contentArray[i - 1];
              }
            }

            const geoObject =
              '{"features":[' + contentArray + '],"type": "FeatureCollection"}';

            // var geoObject = JSON.stringify(geoJ);
            that.setValue(geoObject);

            // $(".location-stored").val(geoObject);
            //    that.model.set(that.name,geoObject);
            // console.log(geoObject);
          } else {
            let stringObject = JSON.stringify(e["features"][0]);

            const geoObject =
              '{"features":[' + stringObject + '],"type": "FeatureCollection"}';

            that.setValue(geoObject);
            // var valueLat = that.options.value.split(',')[0];
            // var valueLon = that.options.value.split(',')[1];
          }
        } else {
        }
      });

      // If someone deleted an object
      this.map.on("draw.delete", function(e) {
        // console.log("draw delete: ", geometry, e);
        let geoJ = geometry;

        if (e.features.length < 2) {
          that.setValue(null);
        } else {
          for (let i = 0; i < e.features.length; i++) {
            let thisItem = e.features[i];

            // console.log("thisItem[i].id: ", thisItem[i].id);

            for (let j = 0; j < geoJ["features"].length; j++) {
              // console.log("Delete for loop");
              // console.log(geoJ["features"][j]["geometry"]["coordinates"][0][0]);
              // console.log(thisItem.geometry.coordinates[0][0]);
              if (geoJ["features"][j]["id"] == thisItem.id) {
                geoJ["features"].splice(j, 1);
              }
            }
          }

          const geoObject = JSON.stringify(geoJ);
          that.setValue(geoObject);
        }
      });

      // If someone moves a feature we want to update stored data
      this.map.on("draw.update", function(e) {
        // console.log("draw update: ", geometry, e);
        // let geoJ = geometry;
        let geoJ = that.value;

        if (e.action === "move" || e.action === "change_coordinates") {
          // console.log("geoJ: ", geoJ.id);

          // Loop through all moved features
          for (let i = 0; i < e.features.length; i++) {
            const thisItem = e.features[i];
            const featureType = e.features[i].geometry.type;

            // console.log("thisItem,featureType: ", thisItem, featureType);

            const geometryAsString = JSON.stringify(geoJ);
            let checkItemLat = thisItem.geometry.coordinates[0];

            // console.log(
            //   "geometryAsString,checkItemLat: ",
            //   geometryAsString,
            //   checkItemLat
            // );

            let objectExists = false;

            if (featureType === "Point") {
              if (geometryAsString.indexOf(checkItemLat) !== -1) {
                objectExists = true;
              }
            } else {
              checkItemLat = thisItem.geometry.coordinates[0][0];
              if (geometryAsString.indexOf(checkItemLat) !== -1) {
                objectExists = true;
              }
            }

            // If feature is already stored, update stored values
            if (objectExists) {
              // Check if this is primary property
              if (thisItem["properties"]["primary"] == true) {
                // console.log("Primary");
                if (featureType === "Point") {
                  let shortLng = parseFloat(
                    e.features[i].geometry.coordinates[0],
                    4
                  ).toFixed(4);
                  let shortLat = parseFloat(
                    e.features[i].geometry.coordinates[1],
                    4
                  ).toFixed(4);

                  for (let j = 0; j < geoJ["features"].length; j++) {
                    if (geoJ["features"][j]["id"] == thisItem.id) {
                      geoJ["features"][j]["geometry"][
                        "coordinates"
                      ][0] = parseFloat(shortLng);
                      geoJ["features"][j]["geometry"][
                        "coordinates"
                      ][1] = parseFloat(shortLat);
                    }
                  }
                }
              } else {
                // console.log("Not primary");
                if (featureType === "Point") {
                  let shortLng = parseFloat(
                    e.features[i].geometry.coordinates[0],
                    4
                  ).toFixed(4);
                  let shortLat = parseFloat(
                    e.features[i].geometry.coordinates[1],
                    4
                  ).toFixed(4);

                  for (let j = 0; j < geoJ["features"].length; j++) {
                    if (geoJ["features"][j]["id"] == thisItem.id) {
                      geoJ["features"][j]["geometry"][
                        "coordinates"
                      ][0] = parseFloat(shortLng);
                      geoJ["features"][j]["geometry"][
                        "coordinates"
                      ][1] = parseFloat(shortLat);
                    }
                  }
                }

                if (featureType === "Polygon") {
                  for (let j = 0; j < geoJ["features"].length; j++) {
                    if (geoJ["features"][j]["id"] == thisItem.id) {
                      // Loop through coordinate array containing points of the polygon
                      for (
                        let k = 0;
                        k <
                        geoJ["features"][j]["geometry"]["coordinates"][0]
                          .length;
                        k++
                      ) {
                        // Set lat long of each point in existing stored object
                        geoJ["features"][j]["geometry"]["coordinates"][0][
                          k
                        ][0] = parseFloat(
                          e.features[i].geometry.coordinates[0][k][0],
                          4
                        );
                        geoJ["features"][j]["geometry"]["coordinates"][0][
                          k
                        ][1] = parseFloat(
                          e.features[i].geometry.coordinates[0][k][1],
                          4
                        );
                      }
                    }
                  }
                }

                if (featureType === "LineString") {
                  // console.log("Line string");
                  for (let j = 0; j < geoJ["features"].length; j++) {
                    // console.log(
                    //   'geoJ["features"][j]["id"] ',
                    //   geoJ["features"][j]["id"],
                    //   " thisItem.id",
                    //   thisItem.id
                    // );

                    if (geoJ["features"][j]["id"] == thisItem.id) {
                      // Loop through coordinate array containing points of the polygon
                      for (
                        let k = 0;
                        k <
                        geoJ["features"][j]["geometry"]["coordinates"].length;
                        k++
                      ) {
                        // Set lat long of each point in existing stored object
                        geoJ["features"][j]["geometry"]["coordinates"][
                          k
                        ][0] = parseFloat(
                          e.features[i].geometry.coordinates[k][0],
                          4
                        );
                        geoJ["features"][j]["geometry"]["coordinates"][
                          k
                        ][1] = parseFloat(
                          e.features[i].geometry.coordinates[k][1],
                          4
                        );
                      }
                    }
                  }
                }
              }

              let geoObject = JSON.stringify(geoJ);
              that.setValue(geoObject);
              // $('.location-stored').val(geoObject);
              // that.model.set(that.name, geoObject);

              // If features aren't stored, add them to the stored data
            } else {
              // Let's assume for now that a lone point is the main point, we will later check properties
              if (featureType === "Point") {
                const shortLng = parseFloat(
                  e.features[i].geometry.coordinates[0],
                  4
                ).toFixed(4);
                const shortLat = parseFloat(
                  e.features[i].geometry.coordinates[1],
                  4
                ).toFixed(4);
                const geoObject =
                  '{"features":[{"id":"primary","type": "Feature","properties": {"primary": true},"geometry": {"coordinates": [' +
                  shortLng +
                  "," +
                  shortLat +
                  '],"type": "Point"}}],"type": "FeatureCollection"}';
                // console.log("Features not stored, store them! ", geoObject);
                that.setValue(geoObject);
                // $('.location-stored').val(geoObject);
                // that.model.set(that.name, geoObject);
              }
            }
          }
        }
      });
    },

    /**
     * Consider if this should always return data in the Geometry format if the database uses that
     */
    setValue(geometryObject) {
      // console.log("set value: ", geometryObject);
      this.geometryObject = geometryObject;
      this.$emit(
        "input",
        this.geometryObject ? JSON.parse(this.geometryObject) : null
      );
    }
  }
};
</script>

<style lang="scss" scoped>
.interface-mapbox-draw {
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

.map {
  position: relative;
  display: flex;
  flex-direction: column;
  border: var(--input-border-width) solid var(--lighter-gray);
  border-radius: var(--border-radius);
}

.map-container {
  z-index: 1;
  width: 100%;
  //This is fallback size. Generally this will be overwritten by default size provided in interface config.
  height: var(--width-medium);
}

.map-actions {
  position: absolute;
  display: flex;
  justify-content: space-between;
  width: 100%;
  top: 20px;
  left: 0px;
  padding: 0 20px;
  z-index: 2;
}

.address-input {
  display: flex;

  .v-input {
    width: 250px;
  }

  button {
    margin-left: 4px;
    transition: var(--fast) var(--transition) color;
    width: 40px;
    height: 40px;
    border-radius: var(--border-radius);
    color: var(--light-gray);
    box-shadow: var(--box-shadow);
    background: #fff;
  }
}

.map-my-location {
  transition: var(--fast) var(--transition) color;
  height: 40px;
  width: 40px;
  border-radius: var(--border-radius);
  color: var(--light-gray);
  box-shadow: var(--box-shadow);
  background: #fff;

  &:hover {
    color: var(--accent);
  }
}

.map-details {
  display: flex;
  margin-top: 4px;
  justify-content: space-between;
  height: 18px;
}

.map-location {
  span {
    color: var(--light-gray);
    text-transform: initial;
    margin-right: 20px;
    font-style: italic;
  }
}

.map-clear {
  text-transform: initial;
  color: var(--accent);
  font-style: italic;
  padding-right: 2px; // To avoid cropping
}

.ssr-search-container {
  position: relative;
  width: 450px;
}

#ssrSearch {
  width: 250px;
}
.ssr-search-container .v-input {
  max-width: 90%;
}

.placename-list {
  position: absolute;
  z-index: 2;
  top: 43px;
  left: 0px;
  height: 494px;
  overflow: auto;
  background: rgba($color: #fff, $alpha: 0.85);
  padding: 15px 0;
  border: 1px solid #dfdfdf;
}

.placename-list li {
  padding: 5px 15px;
  list-style: none;
  font-size: 16px;
  margin-bottom: 5px;
  cursor: pointer;
}

.placename-list li:hover {
  background-color: #dde3e6;
}

//Read Only Map
.map-readonly {
  .map-container {
    filter: grayscale(100%);
    opacity: 0.8;
  }
}

@media only screen and (max-width: 800px) {
  .map {
    display: flex;
  }
}
</style>
