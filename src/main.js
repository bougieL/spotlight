import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "@spotlight/theme/variables.css";
import "@spotlight/theme/global.css";

createApp(App).use(router).mount("#app");
