<script setup lang="ts">
import { computed, getCurrentInstance } from "vue";
const props = defineProps<{
  regions: readonly (readonly number[])[];
  cells: readonly string[];
  automatic?: readonly number[];
  conflicts?: readonly number[];
}>();
const emit = defineEmits<{
  select: [index: number];
  dragStart: [index: number];
  dragMove: [index: number];
  dragEnd: [];
}>();
type BoardRect = { left: number; top: number; width: number; height: number };
declare const uni: {
  createSelectorQuery: () => {
    in: (instance: unknown) => {
      select: (selector: string) => {
        boundingClientRect: (callback: (data: BoardRect | null) => void) => {
          exec: () => void;
        };
      };
    };
  };
};
const instance = getCurrentInstance();
let rect: { left: number; top: number; width: number; height: number } | null =
  null;
function touchStart(index: number) {
  uni
    .createSelectorQuery()
    .in(instance)
    .select(".board")
    .boundingClientRect((data) => {
      if (data && !Array.isArray(data))
        rect = {
          left: data.left,
          top: data.top,
          width: data.width,
          height: data.height,
        };
    })
    .exec();
  emit("dragStart", index);
}
function touchMove(event: TouchEvent) {
  const point = event.touches[0];
  if (!point || !rect) return;
  const column = Math.floor(
    ((point.clientX - rect.left) / rect.width) * size.value,
  );
  const row = Math.floor(
    ((point.clientY - rect.top) / rect.height) * size.value,
  );
  if (row >= 0 && column >= 0 && row < size.value && column < size.value)
    emit("dragMove", row * size.value + column);
}
function touchEnd() {
  emit("dragEnd");
  rect = null;
}
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
const items = computed(() =>
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
  <view
    class="board"
    @touchmove="touchMove"
    @touchend="touchEnd"
    @touchcancel="touchEnd"
  >
    <view
      v-for="cell in items"
      :key="cell.index"
      class="cell"
      :class="{ conflict: conflicts?.includes(cell.index) }"
      :style="style(cell)"
      @tap="emit('select', cell.index)"
      @touchstart="touchStart(cell.index)"
    >
      <text v-if="cells[cell.index] === 'target'">★</text>
      <text v-else-if="cells[cell.index] === 'excluded'">×</text>
      <text v-else-if="automatic?.includes(cell.index)" class="auto">·</text>
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
.auto {
  opacity: 0.4;
}
.conflict {
  box-shadow: inset 0 0 0 2px #d96868;
}
</style>
