<script setup lang="ts">
import { ref, computed } from "vue";
import GameBoard from "../../components/GameBoard.vue";
import {
  createBoard,
  type BoardSize,
} from "../../../../../packages/core/src/board";
import {
  newGame,
  applyOperation,
  undo,
  autoExcluded,
  type GameState,
  type CellState,
} from "../../../../../packages/core/src/game";
import { findConflicts } from "../../../../../packages/core/src/rules";
const size = ref<BoardSize>(4),
  tool = ref<"target" | "excluded">("target"),
  cycle = ref(false);
const board = computed(() =>
  createBoard(
    Array.from({ length: size.value }, (_, row) => Array(size.value).fill(row)),
  ),
);
const state = ref<GameState>(newGame(board.value));
const showAuto = ref(true),
  showConflicts = ref(true);
const automatic = computed(() =>
  showAuto.value ? autoExcluded(board.value, state.value) : [],
);
const conflicts = computed(() => {
  if (!showConflicts.value) return [];
  const positions = state.value.cells.flatMap((value, index) =>
    value === "target"
      ? [{ row: Math.floor(index / size.value), column: index % size.value }]
      : [],
  );
  const pairs = findConflicts(board.value, positions),
    result = new Set<number>();
  for (const pair of pairs) {
    for (const i of [pair.first, pair.second])
      result.add(positions[i].row * size.value + positions[i].column);
  }
  return [...result];
});
function change(next: BoardSize) {
  size.value = next;
  state.value = newGame(board.value);
}
let gestureStart = -1;
let gestureCells = new Set<number>();
let dragging = false;
let suppressTap = false;
function dragStart(index: number) {
  gestureStart = index;
  gestureCells = new Set([index]);
  dragging = false;
}
function dragMove(index: number) {
  if (tool.value !== "excluded" || cycle.value || gestureStart < 0) return;
  if (index !== gestureStart) dragging = true;
  gestureCells.add(index);
}
function dragEnd() {
  if (dragging && tool.value === "excluded" && !cycle.value) {
    const first = state.value.cells[gestureStart];
    const next: CellState = first === "excluded" ? "empty" : "excluded";
    const changes = [...gestureCells]
      .filter((index) => state.value.cells[index] !== "target")
      .map((index) => ({
        position: {
          row: Math.floor(index / size.value),
          column: index % size.value,
        },
        state: next,
      }));
    state.value = applyOperation(board.value, state.value, changes);
    suppressTap = true;
    setTimeout(() => {
      suppressTap = false;
    }, 200);
  }
  gestureStart = -1;
  dragging = false;
}
function select(index: number) {
  if (suppressTap) {
    suppressTap = false;
    return;
  }
  const current = state.value.cells[index];
  const next: CellState = cycle.value
    ? current === "empty"
      ? "excluded"
      : current === "excluded"
        ? "target"
        : "empty"
    : current === tool.value
      ? "empty"
      : tool.value;
  state.value = applyOperation(board.value, state.value, [
    {
      position: {
        row: Math.floor(index / size.value),
        column: index % size.value,
      },
      state: next,
    },
  ]);
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
        >放置 ★</view
      >
      <view
        class="button"
        :class="{ active: tool === 'excluded' && !cycle }"
        @tap="
          tool = 'excluded';
          cycle = false;
        "
        >排除 ×</view
      >
      <view class="button" :class="{ active: cycle }" @tap="cycle = !cycle"
        >单击循环</view
      >
      <view class="button" @tap="state = undo(state)">撤销</view>
    </view>
    <view class="sizes"
      ><view
        v-for="n in [4, 5, 6, 7, 8, 9, 10]"
        :key="n"
        class="button"
        :class="{ active: size === n }"
        @tap="change(n as BoardSize)"
        >{{ n }}×{{ n }}</view
      ></view
    >
    <GameBoard
      :regions="board.regions"
      :cells="state.cells"
      :automatic="automatic"
      :conflicts="conflicts"
      @select="select"
      @drag-start="dragStart"
      @drag-move="dragMove"
      @drag-end="dragEnd"
    />
    <view class="toolbar"
      ><view class="button" @tap="showAuto = !showAuto"
        >自动排除：{{ showAuto ? "开" : "关" }}</view
      ><view class="button" @tap="showConflicts = !showConflicts"
        >冲突框：{{ showConflicts ? "开" : "关" }}</view
      ></view
    >
    <text>错误：{{ state.errors }}</text>
    <text class="note">工程操作验证；尚未接入正式关卡或存档。</text>
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
