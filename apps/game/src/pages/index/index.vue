<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { onHide } from "@dcloudio/uni-app";
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
import { isComplete } from "../../../../../packages/core/src/rules";
import {
  evaluateStars,
  type StarResult,
} from "../../../../../packages/core/src/evaluation";
const size = ref<BoardSize>(4),
  tool = ref<"target" | "excluded">("target"),
  cycle = ref(false);
const board = computed(() =>
  createBoard(
    size.value === 4
      ? [
          [0, 1, 1, 3],
          [0, 1, 3, 3],
          [1, 1, 1, 3],
          [2, 2, 3, 3],
        ]
      : Array.from({ length: size.value }, (_, row) =>
          Array(size.value).fill(row),
        ),
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
declare const uni: {
  setStorageSync: (key: string, value: unknown) => void;
  getStorageSync: (key: string) => unknown;
};
const SAVE_KEY = "gridfun:probe-save:v1";
const BEST_KEY = "gridfun:sample-best:v1";
const TUTORIAL_KEY = "gridfun:tutorial-complete:v2";
const TUTORIAL_SEEN_KEY = "gridfun:tutorial-seen:v2";
const tutorialSteps = [
  { instruction: "点击第一行第三格，放下一颗星。", action: "target", index: 2 },
  {
    instruction: "每行只能有一颗星。再点第一行第一格，观察冲突框。",
    action: "target",
    index: 0,
  },
  { instruction: "点击撤销，移走冲突的星。", action: "undo" },
  {
    instruction: "每列也只能有一颗星。点第四行第三格。",
    action: "target",
    index: 14,
  },
  { instruction: "点击撤销，移走同列的星。", action: "undo" },
  {
    instruction: "每个彩色区域只能有一颗星。点第三行第一格。",
    action: "target",
    index: 8,
  },
  { instruction: "点击撤销，移走同区域的星。", action: "undo" },
  {
    instruction: "星星之间不能相邻，斜角也算。点第二行第四格。",
    action: "target",
    index: 7,
  },
  { instruction: "点击撤销，移走相邻的星。", action: "undo" },
  {
    instruction: "点第一行第二格，体验排除标记。",
    action: "excluded",
    index: 1,
  },
  { instruction: "点击撤销，清除刚才的排除标记。", action: "undo" },
  { instruction: "体验免费教学提示：它只指出一个正确位置。", action: "hint" },
] as const;
const tutorialStep = ref(-1);
const tutorialMessage = ref("");
const tutorial = computed(() => tutorialStep.value >= 0);
const sampleRules = {
  maxStars: 3 as const,
  ruleVersion: 1,
  starRules: [
    { type: "completion" as const, stars: 1 as const },
    {
      type: "duration" as const,
      operator: "lte" as const,
      value: 120,
      stars: 1 as const,
    },
    {
      type: "errorCount" as const,
      operator: "lte" as const,
      value: 2,
      stars: 1 as const,
    },
  ],
};
const paused = ref(false);
const settled = ref(false);
const settlement = ref<StarResult | null>(null);
const bestStars = ref(0);
const confirmReset = ref(false);
const activeMs = ref(0);
const nowMs = ref(Date.now());
let activeSince = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const elapsedSeconds = computed(() =>
  Math.floor(
    (activeMs.value +
      (paused.value || settled.value ? 0 : nowMs.value - activeSince)) /
      1000,
  ),
);
function pause() {
  if (paused.value || settled.value) return;
  activeMs.value += Date.now() - activeSince;
  paused.value = true;
}
function resume() {
  if (!paused.value || settled.value) return;
  activeSince = Date.now();
  nowMs.value = activeSince;
  paused.value = false;
}
function saveLocal() {
  uni.setStorageSync(SAVE_KEY, {
    size: size.value,
    state: state.value,
    activeMs:
      activeMs.value +
      (paused.value || settled.value ? 0 : Date.now() - activeSince),
    savedAt: Date.now(),
  });
}
function restoreLocal() {
  const raw = uni.getStorageSync(SAVE_KEY);
  if (!raw || typeof raw !== "object") return;
  const data = raw as { size?: number; state?: GameState; activeMs?: number };
  if (
    ![4, 5, 6, 7, 8, 9, 10].includes(data.size ?? 0) ||
    !Array.isArray(data.state?.cells) ||
    data.state.cells.length !== (data.size ?? 0) ** 2 ||
    !Number.isFinite(data.activeMs)
  )
    return;
  size.value = data.size as BoardSize;
  state.value = data.state;
  activeMs.value = Math.max(0, data.activeMs ?? 0);
  activeSince = Date.now();
  nowMs.value = activeSince;
  paused.value = true;
}
function resetAttempt() {
  state.value = newGame(board.value);
  settled.value = false;
  settlement.value = null;
  paused.value = false;
  activeMs.value = 0;
  activeSince = Date.now();
  nowMs.value = activeSince;
  confirmReset.value = false;
}
function beginTutorial() {
  size.value = 4;
  resetAttempt();
  tool.value = "target";
  cycle.value = false;
  showAuto.value = false;
  showConflicts.value = true;
  tutorialMessage.value = "";
  tutorialStep.value = 0;
}
function endTutorial(completed: boolean) {
  tutorialStep.value = -1;
  tutorialMessage.value = "";
  showAuto.value = true;
  resetAttempt();
  uni.setStorageSync(TUTORIAL_SEEN_KEY, true);
  if (completed) uni.setStorageSync(TUTORIAL_KEY, true);
}
function tutorialUndo() {
  if (tutorial.value && tutorialSteps[tutorialStep.value]?.action !== "undo") {
    tutorialMessage.value = "先完成上方提示的操作。";
    return;
  }
  state.value = undo(state.value);
  if (tutorial.value) {
    tutorialStep.value++;
    tutorialMessage.value = "";
  }
}
function tutorialHint() {
  if (tutorialSteps[tutorialStep.value]?.action !== "hint") return;
  tutorialStep.value++;
  tutorialMessage.value = "提示：第二行第一格可以放星。教学提示不消耗权益。";
}
onMounted(() => {
  const best = uni.getStorageSync(BEST_KEY);
  if (
    typeof best === "number" &&
    Number.isInteger(best) &&
    best >= 0 &&
    best <= 3
  )
    bestStars.value = best;
  restoreLocal();
  if (
    uni.getStorageSync(TUTORIAL_KEY) !== true &&
    uni.getStorageSync(TUTORIAL_SEEN_KEY) !== true
  )
    beginTutorial();
  timer = setInterval(() => {
    if (!paused.value) nowMs.value = Date.now();
  }, 250);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
watch(state, () => {
  if (size.value !== 4 || settled.value) return;
  const positions = state.value.cells.flatMap((value, index) =>
    value === "target"
      ? [{ row: Math.floor(index / 4), column: index % 4 }]
      : [],
  );
  if (!isComplete(board.value, positions)) return;
  activeMs.value += paused.value ? 0 : Date.now() - activeSince;
  settled.value = true;
  settlement.value = evaluateStars(sampleRules, {
    completed: true,
    durationSeconds: Math.floor(activeMs.value / 1000),
    errorCount: state.value.errors,
  });
  if (settlement.value.stars > bestStars.value) {
    bestStars.value = settlement.value.stars;
    uni.setStorageSync(BEST_KEY, bestStars.value);
  }
});
watch([size, state, paused, settled], saveLocal);
onHide(() => {
  pause();
  saveLocal();
});
function change(next: BoardSize) {
  if (tutorial.value) return;
  size.value = next;
  state.value = newGame(board.value);
  settled.value = false;
  settlement.value = null;
  paused.value = false;
  activeMs.value = 0;
  activeSince = Date.now();
  nowMs.value = activeSince;
}
let gestureStart = -1;
let gestureCells = new Set<number>();
let dragging = false;
let suppressTap = false;
function dragStart(index: number) {
  if (tutorial.value || paused.value || settled.value) return;
  gestureStart = index;
  gestureCells = new Set([index]);
  dragging = false;
}
function dragMove(index: number) {
  if (tutorial.value || paused.value || settled.value) return;
  if (tool.value !== "excluded" || cycle.value || gestureStart < 0) return;
  if (index !== gestureStart) dragging = true;
  gestureCells.add(index);
}
function dragEnd() {
  if (tutorial.value || paused.value || settled.value) return;
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
  if (paused.value || settled.value) return;
  if (tutorial.value) {
    const step = tutorialSteps[tutorialStep.value];
    if (
      !step ||
      (step.action !== "target" && step.action !== "excluded") ||
      step.index !== index
    ) {
      tutorialMessage.value = "请按教学提示点击指定格子。";
      return;
    }
    state.value = applyOperation(board.value, state.value, [
      {
        position: { row: Math.floor(index / 4), column: index % 4 },
        state: step.action,
      },
    ]);
    tutorialStep.value++;
    tutorialMessage.value = "";
    return;
  }
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
    <view v-if="tutorial" class="tutorial-card">
      <text class="tutorial-title"
        >新手教学 {{ Math.min(tutorialStep + 1, tutorialSteps.length + 1) }}/{{
          tutorialSteps.length + 1
        }}</text
      >
      <text v-if="tutorialStep < tutorialSteps.length">{{
        tutorialSteps[tutorialStep].instruction
      }}</text>
      <text v-else>规则体验完成。现在清空练习棋盘，独立完成这道题。</text>
      <text v-if="tutorialMessage" class="tutorial-error">{{
        tutorialMessage
      }}</text>
      <view
        v-if="tutorialSteps[tutorialStep]?.action === 'undo'"
        class="button"
        @tap="tutorialUndo"
        >撤销上一步</view
      >
      <view
        v-if="tutorialSteps[tutorialStep]?.action === 'hint'"
        class="button"
        @tap="tutorialHint"
        >查看单步提示</view
      >
      <view
        v-if="tutorialStep >= tutorialSteps.length"
        class="button active"
        @tap="endTutorial(true)"
        >开始独立挑战</view
      >
      <view class="button" @tap="endTutorial(false)">跳过教学</view>
    </view>
    <view v-else class="toolbar">
      <view class="button" @tap="beginTutorial">新手教学</view>
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
      <view v-if="!settled" class="button" @tap="tutorialUndo">撤销</view>
      <view v-if="!settled" class="button" @tap="paused ? resume() : pause()">{{
        paused ? "继续" : "暂停"
      }}</view>
      <view class="button" @tap="confirmReset = true">重置</view>
    </view>
    <view v-if="!tutorial" class="sizes"
      ><view
        v-for="n in [4, 5, 6, 7, 8, 9, 10]"
        :key="n"
        class="button"
        :class="{ active: size === n }"
        @tap="change(n as BoardSize)"
        >{{ n }}×{{ n }}</view
      ></view
    >
    <view v-if="paused" class="pause-cover">已暂停，棋盘已隐藏</view>
    <GameBoard
      v-else
      :regions="board.regions"
      :cells="state.cells"
      :automatic="automatic"
      :conflicts="conflicts"
      @select="select"
      @drag-start="dragStart"
      @drag-move="dragMove"
      @drag-end="dragEnd"
    />
    <view v-if="!tutorial" class="toolbar"
      ><view class="button" @tap="showAuto = !showAuto"
        >自动排除：{{ showAuto ? "开" : "关" }}</view
      ><view class="button" @tap="showConflicts = !showConflicts"
        >冲突框：{{ showConflicts ? "开" : "关" }}</view
      ></view
    >
    <view v-if="confirmReset" class="confirm">
      <text>确认清空本次棋盘、耗时和错误次数？</text>
      <view class="button" @tap="resetAttempt">确认重置</view>
      <view class="button" @tap="confirmReset = false">取消</view>
    </view>
    <text v-if="!tutorial"
      >耗时：{{ elapsedSeconds }}秒 错误：{{ state.errors }}</text
    >
    <view v-if="settlement && size === 4" class="result">
      <text class="result-title">完成体验题 · {{ settlement.stars }} 星</text>
      <text>完成关卡：达成 · 1 星</text>
      <text
        >120 秒内：{{ settlement.rules[1].achieved ? "达成" : "未达成" }} ·
        {{ elapsedSeconds }} 秒</text
      >
      <text
        >错误不超过 2 次：{{
          settlement.rules[2].achieved ? "达成" : "未达成"
        }}
        · {{ state.errors }} 次</text
      >
      <text>本机体验题最高：{{ bestStars }} 星</text>
      <view class="button" @tap="resetAttempt">再玩一次</view>
    </view>
    <text class="note"
      >4×4
      为唯一解体验题，星级阈值仅用于演示；其他尺寸为操作预览。正式关卡、服务端成绩及下一关尚未接入。</text
    >
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
.pause-cover {
  padding: 80px 16px;
  background: #e4e7df;
  text-align: center;
}
.confirm {
  padding: 12px;
  border: 1px solid #d96868;
  margin: 12px 0;
}
.note {
  display: block;
  color: #7f897d;
  font-size: 12px;
  margin-top: 8px;
}
.result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  margin-top: 12px;
  border: 1px solid #78966f;
  border-radius: 8px;
  background: #f2f6ee;
}
.result-title {
  font-size: 20px;
  font-weight: bold;
}
.tutorial-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #78966f;
  border-radius: 8px;
  background: #f2f6ee;
}
.tutorial-title {
  font-weight: bold;
}
.tutorial-error {
  color: #b34545;
}
</style>
