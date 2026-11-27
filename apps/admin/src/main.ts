import { createApp } from "vue";
import {
  ElAlert,
  ElAside,
  ElButton,
  ElCard,
  ElContainer,
  ElForm,
  ElFormItem,
  ElHeader,
  ElInput,
  ElMain,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import { createRouter, createWebHistory } from "vue-router";
import { createPinia } from "pinia";
import { useAuthStore } from "./auth";
import { setUnauthorizedHandler } from "./api";
const pinia = createPinia();
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./views/Home.vue") },
    { path: "/levels", component: () => import("./views/Levels.vue") },
    { path: "/login", component: () => import("./views/Login.vue") },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
setUnauthorizedHandler(() => {
  useAuthStore(pinia).clear();
  router.replace("/login");
});
router.beforeEach((to) => {
  const auth = useAuthStore(pinia);
  if (to.path === "/login") return auth.authenticated() ? "/" : true;
  return auth.authenticated() ? true : "/login";
});
const app = createApp(App).use(pinia).use(router);
for (const component of [
  ElAlert,
  ElAside,
  ElButton,
  ElCard,
  ElContainer,
  ElForm,
  ElFormItem,
  ElHeader,
  ElInput,
  ElMain,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
])
  app.use(component);
app.mount("#app");
