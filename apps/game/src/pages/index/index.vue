<script setup lang="ts">
import { ref, computed } from "vue";
import GameBoard from "../../components/GameBoard.vue";
type CellState = "empty" | "excluded" | "target";
const size = ref(10),
  tool = ref<"target" | "excluded">("target"),
  cycle = ref(false);
const cells = ref<CellState[]>(Array(100).fill("empty"));
const regions = computed(() =>
  Array.from({ length: size.value }, (_, row) => Array(size.value).fill(row)),
);
function change(next: number) {
  size.value = next;
  cells.value = Array(next * next).fill("empty");
}
function select(index: number) {
  const current = cells.value[index];
  if (cycle.value)
    cells.value[index] =
      current === "empty"
        ? "excluded"
        : current === "excluded"
          ? "target"
          : "empty";
  else cells.value[index] = current === tool.value ? "empty" : tool.value;
}
</script>
<template>
  <view class="probe">
    <text class="title">格有趣 · 操作验证</text>
    <view class="toolbar">
      <view
        class="button"
        :class="{ active: tool === 'target' && !cycle }"
        @tap="
          tool = 'target';
          cycle = false;
        "
      >
        放置 ★
      </view>
      <view
        class="button"
        :class="{ active: tool === 'excluded' && !cycle }"
        @tap="
          tool = 'excluded';
          cycle = false;
        "
      >
        排除 ×
      </view>
      <view class="button" :class="{ active: cycle }" @tap="cycle = !cycle">
        单击循环
      </view>
    </view>
    <view class="sizes">
      <view
        v-for="n in [4, 5, 6, 7, 8, 9, 10]"
        :key="n"
        class="button"
        :class="{ active: size === n }"
        @tap="change(n)"
      >
        {{ n }}×{{ n }}
      </view>
    </view>
    <GameBoard :regions="regions" :cells="cells" @select="select" />
    <text class="note">工程操作验证，尚未接入正式关卡与存档。</text>
  </view>
</template>
<style scoped>
.probe {
  padding: 16px;
  color: #303d35;
}
.title {
  display: block;
  margin-bottom: 12px;
}
.toolbar,
.sizes {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.button {
  padding: 6px 8px;
  margin: 2px;
  border: 1px solid #78966f;
  border-radius: 6px;
}
.active {
  background: #78966f;
  color: white;
}
.note {
  display: block;
  color: #7f897d;
  font-size: 12px;
  margin-top: 8px;
}
</style>
