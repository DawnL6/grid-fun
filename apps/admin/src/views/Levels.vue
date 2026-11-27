<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { api } from "../api";
const keyword = ref("");
const status = ref("");
const size = ref<number | undefined>();
const page = ref(1);
const loading = ref(false);
const error = ref("");
const total = ref(0);
type Level = { id: string; size: number; status: string; createdAt: number };
type Detail = Level & {
  locked: boolean;
  regions: number[][];
  starRules: Record<string, unknown>;
  ruleVersion: number;
};
const items = ref<Level[]>([]);
const detail = ref<Detail | null>(null);
const detailOpen = ref(false);
const createOpen = ref(false);
const saving = ref(false);
const formError = ref("");
const regionText = ref("");
const durationSeconds = ref(120);
const errorLimit = ref(2);
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
          size: size.value,
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
async function showDetail(item: Level) {
  error.value = "";
  try {
    detail.value = (await api.get<Detail>(`/admin/levels/${item.id}`)).data;
    detailOpen.value = true;
  } catch {
    error.value = "关卡详情加载失败。";
  }
}
function openCreate() {
  regionText.value = "";
  durationSeconds.value = 120;
  errorLimit.value = 2;
  formError.value = "";
  createOpen.value = true;
}
function parseRegions(): number[][] | null {
  try {
    const value: unknown = JSON.parse(regionText.value);
    if (!Array.isArray(value) || value.length < 4 || value.length > 10)
      return null;
    const n = value.length;
    if (
      !value.every(
        (row) =>
          Array.isArray(row) &&
          row.length === n &&
          row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < n),
      )
    )
      return null;
    return value as number[][];
  } catch {
    return null;
  }
}
async function createDraft() {
  if (saving.value) return;
  const regions = parseRegions();
  if (!regions) {
    formError.value =
      "区域矩阵须为 4–10 阶方形 JSON 数组，编号从 0 到尺寸减一。";
    return;
  }
  saving.value = true;
  formError.value = "";
  try {
    const response = await api.post<{ id: string }>("/admin/levels", {
      regions,
      starRules: {
        maxStars: 3,
        ruleVersion: 1,
        starRules: [
          { type: "completion", stars: 1 },
          {
            type: "duration",
            operator: "lte",
            value: durationSeconds.value,
            stars: 1,
          },
          {
            type: "errorCount",
            operator: "lte",
            value: errorLimit.value,
            stars: 1,
          },
        ],
      },
    });
    createOpen.value = false;
    page.value = 1;
    await load();
    await showDetail({ id: response.data.id } as Level);
  } catch (cause) {
    const failure = cause as {
      response?: { data?: { code?: string; message?: string } };
    };
    const code = failure.response?.data?.code;
    formError.value =
      code === "DUPLICATE_LEVEL"
        ? "已有等价关卡，不能重复创建。"
        : code === "NOT_UNIQUE"
          ? "该区域矩阵没有唯一解，请调整后重试。"
          : code === "VALIDATION_INCOMPLETE"
            ? "唯一解校验超时或超出预算，请调整矩阵后重试。"
            : code === "INVALID_LEVEL"
              ? "区域连通性或星级规则不合法。"
              : `创建失败：${failure.response?.data?.message || "请检查矩阵和规则"}`;
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div class="heading">
    <h1>关卡资源库</h1>
    <el-button type="primary" @click="openCreate">手动创建草稿</el-button>
  </div>
  <el-form inline>
    <el-form-item label="关键词"
      ><el-input v-model="keyword" placeholder="关卡 ID 或名称"
    /></el-form-item>
    <el-form-item label="尺寸">
      <el-select
        v-model="size"
        placeholder="全部"
        clearable
        style="width: 110px"
      >
        <el-option
          v-for="n in 7"
          :key="n"
          :label="`${n + 3}×${n + 3}`"
          :value="n + 3"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="状态"
      ><el-select
        v-model="status"
        placeholder="全部"
        clearable
        style="width: 120px"
        ><el-option label="草稿" value="draft" /><el-option
          label="已发布"
          value="published" /><el-option
          label="已下架"
          value="offline" /></el-select
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
    <el-table-column label="操作" width="90">
      <template #default="scope"
        ><el-button link @click="showDetail(scope.row)"
          >详情</el-button
        ></template
      >
    </el-table-column>
  </el-table>
  <el-pagination
    v-model:current-page="page"
    :total="total"
    :page-size="20"
    layout="total, prev, pager, next"
    style="margin-top: 16px"
  />
  <el-dialog v-model="detailOpen" title="关卡详情" width="min(680px, 94vw)">
    <template v-if="detail">
      <p>
        ID：{{ detail.id }} · {{ detail.size }}×{{ detail.size }} ·
        {{ detail.status }}
      </p>
      <p>
        规则版本：{{ detail.ruleVersion }} ·
        {{ detail.locked ? "已锁定" : "未锁定" }}
      </p>
      <h3>区域分布</h3>
      <div
        class="region-grid"
        :style="{ gridTemplateColumns: `repeat(${detail.size}, 1fr)` }"
      >
        <template v-for="(row, r) in detail.regions" :key="r">
          <span
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            class="region-cell"
            :style="{ background: `hsl(${(cell * 47) % 360} 40% 83%)` }"
            >{{ cell }}</span
          >
        </template>
      </div>
      <h3>星级规则</h3>
      <pre>{{ JSON.stringify(detail.starRules, null, 2) }}</pre>
      <p class="hint">
        答案不会通过此接口返回；正式预览与试玩将在 S03-07 实现。
      </p>
    </template>
  </el-dialog>
  <el-dialog
    v-model="createOpen"
    title="手动创建关卡草稿"
    width="min(680px, 94vw)"
  >
    <p>粘贴区域编号矩阵。服务端会验证区域连通、唯一解、规则和重复关卡。</p>
    <el-alert
      v-if="formError"
      :title="formError"
      type="error"
      :closable="false"
    />
    <el-form label-width="130px" @submit.prevent="createDraft">
      <el-form-item label="区域矩阵 JSON">
        <el-input
          v-model="regionText"
          type="textarea"
          :rows="9"
          placeholder="[[0,1,1,3],[0,1,3,3],[1,1,1,3],[2,2,3,3]]"
        />
      </el-form-item>
      <el-form-item label="两星用时（秒）"
        ><el-input-number v-model="durationSeconds" :min="1" :max="86400"
      /></el-form-item>
      <el-form-item label="三星错误上限"
        ><el-input-number v-model="errorLimit" :min="0" :max="1000"
      /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createOpen = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="createDraft"
        >验证并保存草稿</el-button
      >
    </template>
  </el-dialog>
</template>
<style scoped>
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.region-grid {
  display: grid;
  gap: 3px;
  width: min(100%, 420px);
}
.region-cell {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: 1px solid #a2aca2;
}
pre {
  overflow: auto;
  padding: 12px;
  background: #f4f6f4;
}
.hint {
  color: #68746b;
}
</style>
