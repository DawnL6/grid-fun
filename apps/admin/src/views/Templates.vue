<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";

type Config = {
  size: number;
  targetDifficulty: number;
  durationSeconds: number;
  errorLimit: number;
};
type Template = {
  id: string;
  name: string;
  config: Config;
  version: number;
  status: string;
  createdAt: number;
};
type Version = {
  version: number;
  name: string;
  config: Config;
  createdAt: number;
};

const items = ref<Template[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const editorOpen = ref(false);
const historyOpen = ref(false);
const editing = ref<Template | null>(null);
const versions = ref<Version[]>([]);
const form = ref<{ name: string; config: Config }>({
  name: "",
  config: { size: 4, targetDifficulty: 1, durationSeconds: 120, errorLimit: 3 },
});

function message(cause: unknown) {
  const response = cause as {
    response?: { status?: number; data?: { code?: string } };
  };
  if (response.response?.data?.code === "VERSION_CONFLICT")
    return "模板已被其他操作修改，请刷新列表后重试。";
  if (response.response?.data?.code === "DUPLICATE_TEMPLATE")
    return "模板名称已存在。";
  return "操作失败，请检查输入或稍后重试。";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const response = await api.get<{ items: Template[]; total: number }>(
      "/admin/level-templates",
      { params: { page: page.value, pageSize: 20 } },
    );
    items.value = response.data.items;
    total.value = response.data.total;
  } catch (cause) {
    error.value = message(cause);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = {
    name: "",
    config: {
      size: 4,
      targetDifficulty: 1,
      durationSeconds: 120,
      errorLimit: 3,
    },
  };
  error.value = "";
  editorOpen.value = true;
}

function openEdit(item: Template) {
  editing.value = item;
  form.value = { name: item.name, config: { ...item.config } };
  error.value = "";
  editorOpen.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.value.name.trim()) {
    error.value = "请输入模板名称。";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const payload = { name: form.value.name.trim(), config: form.value.config };
    if (editing.value)
      await api.put(`/admin/level-templates/${editing.value.id}`, {
        ...payload,
        version: editing.value.version,
      });
    else await api.post("/admin/level-templates", payload);
    editorOpen.value = false;
    await load();
  } catch (cause) {
    error.value = message(cause);
  } finally {
    saving.value = false;
  }
}

async function showHistory(item: Template) {
  error.value = "";
  try {
    const response = await api.get<{ items: Version[] }>(
      `/admin/level-templates/${item.id}/versions`,
    );
    versions.value = response.data.items;
    historyOpen.value = true;
  } catch (cause) {
    error.value = message(cause);
  }
}

onMounted(load);
</script>

<template>
  <div class="heading">
    <div>
      <h1>关卡模板</h1>
      <p>创建和编辑生成参数草稿；当前不会自动生成关卡。</p>
    </div>
    <el-button type="primary" @click="openCreate">新建模板</el-button>
  </div>
  <el-alert
    v-if="error && !editorOpen"
    :title="error"
    type="error"
    :closable="false"
  />
  <el-table :data="items" border :empty-text="loading ? '加载中' : '暂无模板'">
    <el-table-column prop="name" label="名称" min-width="160" />
    <el-table-column label="尺寸" width="90">
      <template #default="scope"
        >{{ scope.row.config.size }}×{{ scope.row.config.size }}</template
      >
    </el-table-column>
    <el-table-column label="目标难度" width="100">
      <template #default="scope">{{
        scope.row.config.targetDifficulty
      }}</template>
    </el-table-column>
    <el-table-column prop="version" label="版本" width="80" />
    <el-table-column prop="status" label="状态" width="90" />
    <el-table-column label="操作" width="180">
      <template #default="scope">
        <el-button
          link
          :disabled="scope.row.status !== 'draft'"
          @click="openEdit(scope.row)"
          >编辑</el-button
        >
        <el-button link @click="showHistory(scope.row)">历史</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-pagination
    v-model:current-page="page"
    :total="total"
    :page-size="20"
    layout="total, prev, pager, next"
    class="pagination"
    @current-change="load"
  />

  <el-dialog
    v-model="editorOpen"
    :title="editing ? '编辑模板' : '新建模板'"
    width="min(560px, 94vw)"
  >
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-form label-width="110px" @submit.prevent="save">
      <el-form-item label="名称"
        ><el-input v-model="form.name" maxlength="80"
      /></el-form-item>
      <el-form-item label="棋盘尺寸"
        ><el-input-number v-model="form.config.size" :min="4" :max="10"
      /></el-form-item>
      <el-form-item label="目标难度"
        ><el-input-number
          v-model="form.config.targetDifficulty"
          :min="1"
          :max="5"
      /></el-form-item>
      <el-form-item label="目标用时（秒）"
        ><el-input-number
          v-model="form.config.durationSeconds"
          :min="1"
          :max="86400"
      /></el-form-item>
      <el-form-item label="错误上限"
        ><el-input-number v-model="form.config.errorLimit" :min="0" :max="1000"
      /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editorOpen = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save"
        >保存草稿</el-button
      >
    </template>
  </el-dialog>

  <el-dialog
    v-model="historyOpen"
    title="模板版本历史"
    width="min(640px, 94vw)"
  >
    <el-table :data="versions" border empty-text="暂无历史">
      <el-table-column prop="version" label="版本" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="参数" min-width="180">
        <template #default="scope"
          >{{ scope.row.config.size }}×{{ scope.row.config.size }}，难度
          {{ scope.row.config.targetDifficulty }}</template
        >
      </el-table-column>
      <el-table-column label="时间" width="175">
        <template #default="scope">{{
          new Date(scope.row.createdAt).toLocaleString()
        }}</template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<style scoped>
.heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
}
.heading h1 {
  margin-bottom: 4px;
}
.heading p {
  color: #68746b;
  margin-top: 0;
}
.pagination {
  margin-top: 16px;
}
</style>
