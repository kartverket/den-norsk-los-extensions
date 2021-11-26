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
export default {
  mixins: [mixin],
  data() {
    return {
      placename: "",
      placenames: []
    };
  },
  methods: {
    updateValueSSR(valueSSR) {
      this.placename = valueSSR;
      this.placenames = [];
      this.$emit("input", valueSSR);
    },
    updateValue(rawValue) {
      // console.log("updateValue:", rawValue);
      let value = rawValue;

      if (value.length > 2 && this.placename === "") {
        this.getPlacenames();
      } else if (value.length < 2) {
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

      const isNum = /^\d+$/.test(query);

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
        const search = urlSearchParams();
        search.set('utkoordsys', 4258);
        if (isNum) {
          search.set('stedsnummer', query);
        } else {
          search.set('sok', query);
          search.set('fuzzy', true);
        }

        const url = new URL('/stedsnavn/v1/sted', 'https://ws.geonorge.no');
        url.search = search.toString();

        const response = await fetch(url, {
          cache: 'default',
        });
        const data = await response.json();

        if (data.metadata.totaltAntallTreff > 0) {
          const total = data.navn.length;
          for (let i = 0; i < total; i++) {
            const placeNameResults = {};
            placeNameResults.id = i;

            const placeName = data['sted'][i]['stedsnavn'][0]['skrivemåte'];
            const placeKommune = data['kommuner'][0]['kommunenavn'];
            const placeFylke = data['fylker'][0]['fylkesnavn'];
            const placeLat = parseFloat(data['navn'][i]['representasjonspunkt']['nord']).toFixed(4);
            const placeLng = parseFloat(data['navn'][i]['representasjonspunkt']['øst']).toFixed(4);
            const nameType = data['navn'][i]['navneobjekttype'];
            const placeNumber = data['navn'][i]['stedsnummer'];
            const nameStatus = data['navn'][i]['stedsnavn'][0]['skrivemåtestatus'];

            placeNameResults.label = `${placeName}, ${placeKommune}, ${placeFylke} - ${nameType} - `;
            placeNameResults.value = `${placeLat}, ${placeLng} - ${placeNumber}`;

            const checkForUnwanted = unwantedPlace.indexOf(nameType);
            const checkForConfirmed = confirmedPlace.indexOf(nameStatus);

            if (checkForUnwanted === -1 && checkForConfirmed !== -1) {
              ssrResults.push(placeNameResults);
            }
          }
        }

        this.placenames = ssrResults;
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
.ssr-search-container {
  position: relative;
}

.placename-list {
  position: absolute;
  z-index: 2;
  top: 43px;
  left: 0px;
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
</style>
