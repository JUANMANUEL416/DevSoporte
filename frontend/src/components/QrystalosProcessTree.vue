<template>
  <div class="qrys-proc-tree">
    <template v-for="node in nodes">
      <q-expansion-item
        v-if="showAsGrouper(node)"
        :key="`g-${nodeKey(node)}`"
        dense
        expand-separator
        :default-opened="depth < 1"
        :header-class="`qrys-proc-tree__header qrys-proc-tree__header--depth-${Math.min(depth, 3)}`"
        class="qrys-proc-tree__group"
      >
        <template #header>
          <q-item-section avatar>
            <q-icon name="folder" :color="depth === 0 ? 'primary' : 'teal'" size="18px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">
              <span class="qrys-proc-tree__num">{{ node.codigo_num }}</span>
              {{ node.process?.nombre }}
            </q-item-label>
            <q-item-label caption>{{ node.process?.tipo }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round icon="edit" color="primary" size="sm" @click.stop="emitEdit(node.process)" />
          </q-item-section>
        </template>

        <div class="qrys-proc-tree__body">
          <QrystalosProcessTree
            v-if="groupChildren(node).length"
            :nodes="groupChildren(node)"
            :depth="depth + 1"
            @edit="emitEdit"
          />
          <q-markup-table v-if="leafChildren(node).length" flat bordered dense class="qrys-proc-tree__table">
            <thead>
              <tr>
                <th style="width: 40px" />
                <th>Núm.</th>
                <th>Tipo</th>
                <th>Proceso</th>
                <th class="text-right">Min</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="leaf in leafChildren(node)" :key="leaf.process.codigo">
                <td>
                  <q-btn flat dense round icon="edit" color="primary" size="sm" @click="emitEdit(leaf.process)" />
                </td>
                <td>{{ leaf.process.codigo_num }}</td>
                <td>{{ leaf.process.tipo }}</td>
                <td>{{ leaf.process.nombre }}</td>
                <td class="text-right">{{ leaf.process.duracion_sugerida ?? '—' }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>
      </q-expansion-item>

      <q-markup-table v-else :key="`l-${nodeKey(node)}`" flat bordered dense class="qrys-proc-tree__table qrys-proc-tree__table--root">
        <tbody>
          <tr>
            <td style="width: 40px">
              <q-btn flat dense round icon="edit" color="primary" size="sm" @click="emitEdit(node.process)" />
            </td>
            <td>{{ node.process.codigo_num }}</td>
            <td>{{ node.process.tipo }}</td>
            <td>{{ node.process.nombre }}</td>
            <td class="text-right">{{ node.process.duracion_sugerida ?? '—' }}</td>
          </tr>
        </tbody>
      </q-markup-table>
    </template>
  </div>
</template>

<script setup>
import QrystalosProcessTree from './QrystalosProcessTree.vue';

defineOptions({ name: 'QrystalosProcessTree' });

defineProps({
  nodes: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
});

const emit = defineEmits(['edit']);

function nodeKey(node) {
  return node.process?.codigo || node.codigo_num;
}

function showAsGrouper(node) {
  return node.isGrouper || node.children.length > 0;
}

function groupChildren(node) {
  return node.children.filter((c) => c.isGrouper || c.children.length > 0);
}

function leafChildren(node) {
  return node.children.filter((c) => !c.isGrouper && c.children.length === 0);
}

function emitEdit(row) {
  if (row) emit('edit', row);
}
</script>

<style scoped lang="scss">
.qrys-proc-tree__group {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
  background: #fff;
}

.qrys-proc-tree__header {
  background: #f1f5f9;
}

.qrys-proc-tree__header--depth-1 {
  background: #ecfdf5;
}

.qrys-proc-tree__header--depth-2,
.qrys-proc-tree__header--depth-3 {
  background: #f0fdfa;
}

.qrys-proc-tree__body {
  padding: 6px 8px 8px 12px;
}

.qrys-proc-tree__num {
  color: #64748b;
  font-size: 0.82rem;
  margin-right: 6px;
}

.qrys-proc-tree__table {
  margin-top: 4px;
  margin-bottom: 4px;
}

.qrys-proc-tree__table--root {
  margin-bottom: 6px;
}
</style>
