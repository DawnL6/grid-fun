<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter, RouterView, RouterLink } from "vue-router";
const router = useRouter();
const token = ref("");
const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);
async function login() {
  busy.value = true;
  error.value = "";
  try {
    const response = await axios.post("/api/v1/admin/auth/login", {
      username: username.value,
      password: password.value,
    });
    token.value = response.data.token;
    password.value = "";
    await router.push("/");
  } catch {
    error.value = "登录失败，请检查账号或密码。";
  } finally {
    busy.value = false;
  }
}
async function logout() {
  try {
    await axios.post("/api/v1/admin/auth/logout", null, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
  } finally {
    token.value = "";
    await router.push("/login");
  }
}
onMounted(() => {
  if (!token.value) router.replace("/login");
});
</script>
<template>
  <main v-if="!token" class="login-wrap">
    <el-card class="login-card">
      <h1>格有趣 · 管理后台</h1>
      <p>请使用管理员账号登录</p>
      <el-form @submit.prevent="login">
        <el-form-item label="账号"
          ><el-input v-model="username" autocomplete="username"
        /></el-form-item>
        <el-form-item label="密码"
          ><el-input
            v-model="password"
            type="password"
            show-password
            autocomplete="current-password"
        /></el-form-item>
        <el-alert v-if="error" :title="error" type="error" :closable="false" />
        <el-button type="primary" native-type="submit" :loading="busy"
          >登录</el-button
        >
      </el-form>
    </el-card>
  </main>
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
        ><span>管理后台 · 工程预览</span
        ><el-button text @click="logout">退出登录</el-button></el-header
      >
      <el-main><RouterView /></el-main>
    </el-container>
  </el-container>
</template>
<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f1f5ef;
}
.login-card {
  width: min(420px, calc(100vw - 32px));
}
.login-card h1 {
  margin: 0 0 8px;
}
.login-card p {
  color: #647067;
}
.login-card .el-button {
  width: 100%;
  margin-top: 16px;
}
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
