<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../auth";

const router = useRouter();
const auth = useAuthStore();
const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await auth.login(username.value.trim(), password.value);
    password.value = "";
    await router.replace("/");
  } catch {
    error.value = "登录失败，请检查账号或密码。";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="login-wrap">
    <el-card class="login-card">
      <h1>格有趣 · 管理后台</h1>
      <p>请使用管理员账号登录</p>
      <el-form @submit.prevent="submit">
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
</style>
