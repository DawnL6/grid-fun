<script setup lang="ts">
import { useRouter, RouterView, RouterLink } from "vue-router";
import { useAuthStore } from "./auth";
const router = useRouter();
const auth = useAuthStore();
async function logout() {
  try {
    await auth.logout();
  } finally {
    await router.replace("/login");
  }
}
</script>
<template>
  <RouterView v-if="$route.path === '/login'" />
  <el-container v-else class="shell">
    <el-aside width="220px" class="sidebar">
      <h2>格有趣</h2>
      <nav>
        <RouterLink to="/">概览</RouterLink
        ><RouterLink to="/levels">关卡资源库</RouterLink>
      </nav>
    </el-aside>
    <el-container>
      <el-header class="header"
        ><span>管理后台 · {{ auth.admin?.username }}</span
        ><el-button text @click="logout">退出登录</el-button></el-header
      >
      <el-main><RouterView /></el-main>
    </el-container>
  </el-container>
</template>
<style scoped>
.shell {
  min-height: 100vh;
}
.sidebar {
  background: #26372d;
  color: #fff;
  padding: 24px 14px;
}
.sidebar h2 {
  margin: 0 10px 28px;
}
.sidebar nav {
  display: grid;
  gap: 8px;
}
.sidebar a {
  color: #dce8dc;
  text-decoration: none;
  padding: 10px;
  border-radius: 6px;
}
.sidebar a.router-link-exact-active {
  background: #456b4c;
  color: #fff;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e9e4;
}
</style>
