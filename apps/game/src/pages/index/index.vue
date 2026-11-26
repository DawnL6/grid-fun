<script setup lang="ts">
import { ref, computed } from "vue";
import GameBoard from "../../components/GameBoard.vue";
const size = ref(10);
const selected = ref(-1);
const regions = computed(() =>
  Array.from({ length: size.value }, (_, row) => Array(size.value).fill(row)),
);
function change(next: number) {
  size.value = next;
  selected.value = -1;
}
</script>
<template>
  <view class="probe">
    <text class="title">格有趣 · 棋盘组件验证</text>
    <view class="sizes">
      <view
        v-for="n in [4, 5, 6, 7, 8, 9, 10]"
        :key="n"
        class="size"
        :class="{ active: size === n }"
        @tap="change(n)"
      >
        {{ n }}×{{ n }}
      </view>
    </view>
    <GameBoard
      :regions="regions"
      :selected="selected"
      @select="selected = $event"
    />
    <text>当前：{{ size }}×{{ size }} 点击格：{{ selected }}</text>
    <text class="note">工程组件验证，尚未接入正式关卡。</text>
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
.sizes {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.size {
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
