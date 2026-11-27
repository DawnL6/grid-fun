<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { api } from "../api";
const keyword = ref("");
const status = ref("");
const page = ref(1);
const loading = ref(false);
const error = ref("");
const total = ref(0);
type Level = { id: string; size: number; status: string; createdAt: number };
const items = ref<Level[]>([]);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const response = await api.get<{ items: Level[]; total: number }>(
      "/admin/levels",
      {
        params: {
          keyword: keyword.value || undefined,
          status: status.value || undefined,
          page: page.value,
          pageSize: 20,
        },
      },
    );
    items.value = response.data.items;
    total.value = response.data.total;
  } catch {
    error.value = "关卡列表加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
function search() {
  if (page.value === 1) void load();
  else page.value = 1;
}
watch(page, load);
onMounted(load);
</script>
<template>
  <h1>关卡资源库</h1>
  <el-form inline>
    <el-form-item label="关键词"
      ><el-input v-model="keyword" placeholder="关卡 ID 或名称"
    /></el-form-item>
    <el-form-item label="状态"
      ><el-select
        v-model="status"
        placeholder="全部"
        clearable
        style="width: 120px"
        ><el-option label="草稿" value="draft" /><el-option
          label="已发布"
          value="published" /></el-select
    ></el-form-item>
    <el-form-item><el-button @click="search">搜索</el-button></el-form-item>
  </el-form>
  <el-alert
    v-if="error"
    :title="error"
    type="error"
    :closable="false"
    style="margin-bottom: 12px"
  />
  <el-table :data="items" border :empty-text="loading ? '加载中' : '暂无关卡'">
    <el-table-column prop="id" label="关卡 ID" /><el-table-column
      prop="size"
      label="尺寸"
    /><el-table-column prop="status" label="状态" />
  </el-table>
  <el-pagination
    v-model:current-page="page"
    :total="total"
    :page-size="20"
    layout="total, prev, pager, next"
    style="margin-top: 16px"
  />
</template>
