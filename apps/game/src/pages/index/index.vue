<script setup lang="ts">
import { ref } from "vue";
const size = 10;
const selected = ref(-1);
const touched = ref(-1);
const cells = Array.from({ length: size * size }, (_, i) => ({
  id: i,
  region: Math.floor(i / size),
  shade: i % 2 ? "#EBC69C" : "#B8D5A3",
}));
function select(i: number) {
  selected.value = i;
}
function touch(i: number) {
  touched.value = i;
}
</script>
<template>
  <view class="probe">
    <text class="title"> 格有趣 · 平台触摸验证 </text>
    <view class="board">
      <view
        v-for="cell in cells"
        :key="cell.id"
        class="cell"
        :style="{
          backgroundColor: cell.shade,
          borderBottomWidth:
            cell.id < 90 && cells[cell.id + 10]?.region !== cell.region
              ? '3px'
              : '1px',
        }"
        @tap="select(cell.id)"
        @touchstart="touch(cell.id)"
      >
        <text v-if="selected === cell.id"> ★ </text>
      </view>
    </view>
    <text>点击格：{{ selected }} 触摸开始格：{{ touched }}</text>
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
.board {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  max-width: 500px;
}
.cell {
  box-sizing: border-box;
  width: 10%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #303d35;
  border-bottom-style: solid;
}
</style>
