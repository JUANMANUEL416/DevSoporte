<template>
  <div class="qrys-picker">
    <q-input
      v-if="searchable"
      :model-value="search"
      dense
      outlined
      debounce="250"
      label="Buscar proceso"
      class="q-mb-sm"
      @update:model-value="(v) => emit('update:search', v)"
    />
    <q-scroll-area :style="{ height: scrollHeight }">
      <div class="qrys-picker__tree">
        <QrystalosProcessPickerNode
          v-for="node in filteredNodes"
          :key="node.process?.codigo || node.codigo_num"
          :node="node"
          :depth="0"
          :selected="selectedSet"
          @toggle-node="onToggleNode"
          @toggle-leaf="onToggleLeaf"
        />
        <div v-if="!filteredNodes.length" class="text-grey q-pa-md text-center">
          Sin procesos para mostrar.
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  buildProcessTree,
  filterProcessTree,
  collectSelectableCodes,
  nodeSelectionState,
} from 'src/utils/qrystalosProcessTree';
import QrystalosProcessPickerNode from './QrystalosProcessPickerNode.vue';

const props = defineProps({
  processes: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  search: { type: String, default: '' },
  searchable: { type: Boolean, default: true },
  scrollHeight: { type: String, default: '65vh' },
});

const emit = defineEmits(['update:modelValue', 'update:search']);

const treeNodes = computed(() => buildProcessTree(props.processes));
const filteredNodes = computed(() => filterProcessTree(treeNodes.value, props.search));
const selectedSet = computed(() => new Set(props.modelValue || []));

function setSelected(codes) {
  emit('update:modelValue', [...new Set(codes)]);
}

function onToggleNode(node, checked) {
  const { codes } = nodeSelectionState(node, selectedSet.value);
  const next = new Set(selectedSet.value);
  if (checked) codes.forEach((c) => next.add(c));
  else codes.forEach((c) => next.delete(c));
  setSelected([...next]);
}

function onToggleLeaf(codigo, checked) {
  const next = new Set(selectedSet.value);
  if (checked) next.add(codigo);
  else next.delete(codigo);
  setSelected([...next]);
}

void collectSelectableCodes;
</script>

<style scoped lang="scss">
.qrys-picker__tree {
  padding: 4px 2px 8px;
}
</style>
