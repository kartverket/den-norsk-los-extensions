<template>
  <div class="ssr-search-container">
    <v-input
      type="text"
      icon-right-color
      :value="value || ''"
      :readonly="readonly"
      :placeholder="options.placeholder"
      :icon-left="options.iconLeft"
      :icon-right="options.iconRight"
      :maxlength="length ? +length : null"
      :id="name"
      :charactercount="options.showCharacterCount"
      v-model="value"
      @input="updateValue"
    ></v-input>
    <ul class="placename-list" v-if="placenames && placenames.length > 0">
      <li 
        v-for="placename in placenames" 
        :key="placename.id"
        @click="updateValueSSR(placename.label + placename.value)"
      >{{placename.label + placename.value}}</li>
    </ul>
  </div>
</template>

<script>
import mixin from "@directus/extension-toolkit/mixins/interface";
import { parseString } from "xml2js";
export default {
  mixins: [mixin],
  data() {
    return {
      placename: "",
      placenames: []
    };
  },
  methods: {
    updateValueSSR(valueSSR){
      
      this.placename = valueSSR;
      this.placenames = [];
      this.$emit("input", valueSSR);
    },
    updateValue(rawValue) {
      // console.log("updateValue:", rawValue);
      let value = rawValue;

      if (value.length > 2 && this.placename === "") {
        this.getPlacenames();
      } else if(value.length < 2){
        this.placename = "";
      }

      if (this.options.trim) {
        if (!this.value || value.length > this.value.length) {
          value = value.trim();
        }
      }
      this.$emit("input", value);
    },    
    async getPlacenames() {
      let query = this.value.trim().toLowerCase();
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
        "Elv",
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
        "Småbåthavn",
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
        const response = await fetch(
          "https://ws.geonorge.no/SKWS3Index/v2/ssr/sok?navn=" +
            query +
            "*&epsgKode=4258&eksakteForst=true",
          {
            cache: "default",
            dataType: "xml"
          }
        );
        const data = await response.text();
        parseString(data, function(err, result) {
          if (result) {
            // console.log(result,err);
            if (result.sokRes.stedsnavn) {
              if (result.sokRes.stedsnavn.length < resultLimit) {
                resultLimit = result.sokRes.stedsnavn.length;
              }

              for (var r = 0; r < resultLimit; r++) {
                let placeNameResults = {};

                const placeName = result.sokRes.stedsnavn[r].stedsnavn[0];
                const placeKommune = result.sokRes.stedsnavn[r].kommunenavn[0];
                const placeFylke = result.sokRes.stedsnavn[r].fylkesnavn[0];
                let placeLat = result.sokRes.stedsnavn[r].nord[0];
                let placeLng = result.sokRes.stedsnavn[r].aust[0];
                const nameType = result.sokRes.stedsnavn[r].navnetype[0];
                const placeNumber = result.sokRes.stedsnavn[r].stedsnummer[0];
                const nameStatus = result.sokRes.stedsnavn[r].skrivemaatestatus[0];

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
                  " - " +
                  placeNumber;
                placeNameResults.value =
                  "(" + placeLat + ", " + placeLng + ")";

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
        // console.log("data: ", ssrResults);
      } catch (error) {
        console.error(error);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.v-input {
  width: 100%;
  max-width: var(--width-medium);
}
.ssr-search-container{
  position: relative;
}

.placename-list{
  position: absolute;
  z-index: 2;
  top: 43px;
  left: 0px;
  background: rgba($color: #FFF, $alpha: 0.85);
  padding: 15px 0;
  border: 1px solid #DFDFDF;
}

.placename-list li{
  padding: 5px 15px;
  list-style: none;
  font-size: 16px;
  margin-bottom: 5px;
  cursor: pointer;
}

.placename-list li:hover{
  background-color: #dde3e6;  
}
</style>