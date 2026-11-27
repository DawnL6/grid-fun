import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import Levels from "./views/Levels.vue";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/levels", component: Levels },
    { path: "/login", component: Home },
  ],
});
createApp(App).use(ElementPlus).use(router).mount("#app");
