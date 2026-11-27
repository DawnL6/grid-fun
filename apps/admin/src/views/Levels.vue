<script setup lang="ts">
import { ref } from "vue";
const keyword = ref("");
const status = ref("");
const page = ref(1);
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
    <el-form-item><el-button disabled>搜索（待接入）</el-button></el-form-item>
  </el-form>
  <el-table
    :data="[]"
    border
    empty-text="关卡 API 尚未接入；这里不显示模拟数据"
  >
    <el-table-column prop="id" label="关卡 ID" /><el-table-column
      prop="size"
      label="尺寸"
    /><el-table-column prop="status" label="状态" />
  </el-table>
  <el-pagination
    v-model:current-page="page"
    :total="0"
    :page-size="20"
    layout="total, prev, pager, next"
    style="margin-top: 16px"
  />
</template>
