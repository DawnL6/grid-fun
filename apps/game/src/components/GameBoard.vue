<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ regions: number[][]; selected?: number }>();
const emit = defineEmits<{ select: [index: number] }>();
const colors = [
  "#B8D5A3",
  "#EBC69C",
  "#A8CEDF",
  "#CDB9E2",
  "#E6B4C6",
  "#E8D78C",
  "#91C5BA",
  "#AABBE1",
  "#D9AE98",
  "#C5C9A0",
];
const size = computed(() => props.regions.length);
const cells = computed(() =>
  props.regions.flatMap((row, r) =>
    row.map((region, c) => ({
      index: r * size.value + c,
      region,
      row: r,
      column: c,
    })),
  ),
);
function style(cell: { region: number; row: number; column: number }) {
  const { row, column, region } = cell,
    n = size.value;
  return {
    width: `${100 / n}%`,
    backgroundColor: colors[region % colors.length],
    borderTopWidth:
      row === 0 || props.regions[row - 1][column] !== region ? "3px" : "1px",
    borderLeftWidth:
      column === 0 || props.regions[row][column - 1] !== region ? "3px" : "1px",
    borderRightWidth: column === n - 1 ? "3px" : "0px",
    borderBottomWidth: row === n - 1 ? "3px" : "0px",
  };
}
</script>
<template>
  <view class="board">
    <view
      v-for="cell in cells"
      :key="cell.index"
      class="cell"
      :style="style(cell)"
      @tap="emit('select', cell.index)"
    >
      <text v-if="selected === cell.index">★</text>
    </view>
  </view>
</template>
<style scoped>
.board {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  max-width: 500px;
}
.cell {
  box-sizing: border-box;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  border-style: solid;
  border-color: #303d35;
  font-size: 18px;
}
</style>
