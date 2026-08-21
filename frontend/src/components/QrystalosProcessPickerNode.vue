<template>
  <div class="qrys-picker-node">
    <q-expansion-item
      v-if="showAsGrouper"
      dense
      expand-separator
      :default-opened="depth < 2"
      :header-class="`qrys-picker-node__header qrys-picker-node__header--d${Math.min(depth, 3)}`"
      class="qrys-picker-node__group"
    >
      <template #header>
        <q-item-section side @click.stop>
          <q-checkbox
            :model-value="groupState.checked"
            :indeterminate="groupState.indeterminate"
            dense
            @update:model-value="(v) => emit('toggle-node', node, v)"
          />
        </q-item-section>
        <q-item-section avatar>
          <q-icon name="folder" :color="depth === 0 ? 'primary' : 'teal'" size="18px" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">
            <span class="qrys-picker-node__num">{{ node.codigo_num }}</span>
            {{ node.process?.nombre }}
          </q-item-label>
          <q-item-label caption>{{ node.process?.tipo }}</q-item-label>
        </q-item-section>
      </template>

      <div class="qrys-picker-node__body">
        <QrystalosProcessPickerNode
          v-for="child in groupChildren"
          :key="child.process?.codigo || child.codigo_num"
          :node="child"
          :depth="depth + 1"
          :selected="selected"
          @toggle-node="(n, v) => emit('toggle-node', n, v)"
          @toggle-leaf="(c, v) => emit('toggle-leaf', c, v)"
        />
        <q-list v-if="leafChildren.length" dense bordered separator class="qrys-picker-node__leaves">
          <q-item v-for="leaf in leafChildren" :key="leaf.process.codigo" tag="label" dense>
            <q-item-section side>
              <q-checkbox
                dense
                :model-value="selected.has(leaf.process.codigo)"
                @update:model-value="(v) => emit('toggle-leaf', leaf.process.codigo, v)"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ leaf.process.nombre }}</q-item-label>
              <q-item-label caption>{{ leaf.process.codigo_num }} · {{ leaf.process.tipo }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-expansion-item>

    <q-list v-else-if="node.process" dense bordered class="qrys-picker-node__single">
      <q-item tag="label" dense>
        <q-item-section side>
          <q-checkbox
            dense
            :model-value="selected.has(node.process.codigo)"
            @update:model-value="(v) => emit('toggle-leaf', node.process.codigo, v)"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ node.process.nombre }}</q-item-label>
          <q-item-label caption>{{ node.process.codigo_num }} · {{ node.process.tipo }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { nodeSelectionState } from 'src/utils/qrystalosProcessTree';
import QrystalosProcessPickerNode from './QrystalosProcessPickerNode.vue';

defineOptions({ name: 'QrystalosProcessPickerNode' });

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selected: { type: Object, required: true },
});

const emit = defineEmits(['toggle-node', 'toggle-leaf']);

const showAsGrouper = computed(
  () => props.node.isGrouper || (props.node.children?.length ?? 0) > 0,
);

const groupChildren = computed(() =>
  (props.node.children || []).filter((c) => c.isGrouper || (c.children?.length ?? 0) > 0),
);

const leafChildren = computed(() =>
  (props.node.children || []).filter((c) => !c.isGrouper && !(c.children?.length ?? 0)),
);

const groupState = computed(() => nodeSelectionState(props.node, props.selected));
</script>

<style scoped lang="scss">
.qrys-picker-node__group {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
}

.qrys-picker-node__header {
  background: #f8fafc;
}

.qrys-picker-node__header--d1 {
  background: #ecfdf5;
}

.qrys-picker-node__header--d2,
.qrys-picker-node__header--d3 {
  background: #f0fdfa;
}

.qrys-picker-node__body {
  padding: 4px 8px 8px 12px;
}

.qrys-picker-node__num {
  color: #64748b;
  font-size: 0.82rem;
  margin-right: 6px;
}

.qrys-picker-node__leaves,
.qrys-picker-node__single {
  margin: 4px 0;
}
</style>
