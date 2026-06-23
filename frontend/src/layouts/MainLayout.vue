<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <q-toolbar-title>DevSoporte</q-toolbar-title>
        <q-space />
        <span class="layout-version q-mr-md">v{{ appVersion }}</span>
        <div class="q-mr-md layout-user">{{ auth.user?.nombre || auth.user?.usuario }}</div>
        <q-btn flat dense round icon="logout" @click="logout">
          <q-tooltip>Salir</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above bordered :width="272" class="sidebar-drawer">
      <q-scroll-area class="fit sidebar-scroll">
        <q-list class="sidebar-list">
          <q-item
            clickable
            v-ripple
            :to="'/'"
            exact
            class="sidebar-item sidebar-item--inicio"
            active-class="sidebar-item--active"
          >
            <q-item-section avatar>
              <div class="sidebar-icon sidebar-icon--inicio">
                <q-icon name="dashboard" size="18px" />
              </div>
            </q-item-section>
            <q-item-section class="sidebar-item__label">Inicio</q-item-section>
          </q-item>

          <q-expansion-item
            v-for="(items, group) in groups"
            :key="group"
            v-model="expandedGroups[group]"
            expand-icon-class="sidebar-group__chevron"
            header-class="sidebar-group__header"
            class="sidebar-group"
            :class="`sidebar-group--${groupKey(group)}`"
          >
            <template #header>
              <q-item-section avatar>
                <div class="sidebar-icon" :class="`sidebar-icon--${groupKey(group)}`">
                  <q-icon :name="groupIcon(group)" size="18px" />
                </div>
              </q-item-section>
              <q-item-section class="sidebar-group__label">{{ group }}</q-item-section>
            </template>

            <q-item
              v-for="m in items"
              :key="m.resource"
              clickable
              v-ripple
              :to="`/${m.resource}`"
              class="sidebar-item sidebar-item--sub"
              :class="`sidebar-item--${groupKey(group)}`"
              active-class="sidebar-item--active"
            >
              <q-item-section avatar>
                <div class="sidebar-icon sidebar-icon--sm" :class="`sidebar-icon--${groupKey(group)}`">
                  <q-icon :name="m.icon" size="16px" />
                </div>
              </q-item-section>
              <q-item-section class="sidebar-item__label">{{ m.title }}</q-item-section>
            </q-item>
          </q-expansion-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { modulesByGroup } from 'src/config/modules';

const drawer = ref(true);
const auth = useAuthStore();
const router = useRouter();
const appVersion = process.env.APP_VERSION || '0.0.0';
const groups = modulesByGroup();
const expandedGroups = ref(
  Object.fromEntries(Object.keys(groups).map((group) => [group, true])),
);

const groupIcons = {
  Configuración: 'settings',
  Desarrollo: 'developer_board',
  Soporte: 'support_agent',
  Solicitudes: 'inbox',
  Seguridad: 'security',
};

function groupIcon(group) {
  return groupIcons[group] || 'folder';
}

function groupKey(group) {
  return group
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.layout-version {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.95);
}

.layout-user {
  font-size: 0.9rem;
}

.sidebar-drawer {
  background: #f8fafc;
  border-right: 1px solid #e2e8f0 !important;
}

.sidebar-scroll {
  padding: 12px 10px;
}

.sidebar-list {
  :deep(.q-item) {
    min-height: 44px;
  }

  :deep(.q-separator) {
    display: none;
  }
}

.sidebar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid transparent;
  color: #1e293b;

  &--sm {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  &--inicio {
    background: linear-gradient(90deg, #dbeafe 0%, #93c5fd 100%);
    border-color: #93c5fd;
    color: #1d4ed8;
  }

  &--configuracion {
    background: linear-gradient(90deg, #e8eaf6 0%, #9fa8da 100%);
    border-color: #9fa8da;
    color: #3949ab;
  }

  &--desarrollo {
    background: linear-gradient(90deg, #ede7f6 0%, #b39ddb 100%);
    border-color: #b39ddb;
    color: #5e35b1;
  }

  &--soporte {
    background: linear-gradient(90deg, #e0f2f1 0%, #80cbc4 100%);
    border-color: #80cbc4;
    color: #00695c;
  }

  &--solicitudes {
    background: linear-gradient(90deg, #e3f2fd 0%, #64b5f6 100%);
    border-color: #64b5f6;
    color: #1565c0;
  }

  &--seguridad {
    background: linear-gradient(90deg, #eceff1 0%, #b0bec5 100%);
    border-color: #b0bec5;
    color: #455a64;
  }
}

.sidebar-item {
  margin-bottom: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(90deg, #ffffff 0%, #f1f5f9 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  :deep(.q-item__section--avatar) {
    min-width: 42px;
    padding-right: 8px;
  }

  &--sub {
    margin-left: 8px;
    margin-right: 4px;
    padding: 5px 10px;
    border-radius: 9px;

    :deep(.q-item__section--avatar) {
      min-width: 38px;
    }
  }

  &--inicio {
    background: linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%);
    border-color: #bfdbfe;
  }

  &--configuracion {
    background: linear-gradient(90deg, #fafbff 0%, #e8eaf6 100%);
    border-color: #c5cae9;
  }

  &--desarrollo {
    background: linear-gradient(90deg, #fdfbff 0%, #ede7f6 100%);
    border-color: #d1c4e9;
  }

  &--soporte {
    background: linear-gradient(90deg, #f6fffe 0%, #e0f2f1 100%);
    border-color: #b2dfdb;
  }

  &--solicitudes {
    background: linear-gradient(90deg, #f5faff 0%, #e3f2fd 100%);
    border-color: #bbdefb;
  }

  &--seguridad {
    background: linear-gradient(90deg, #fafbfc 0%, #eceff1 100%);
    border-color: #cfd8dc;
  }

  &:hover {
    border-color: #94a3b8;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  &--active {
    border-color: #1565c0 !important;
    box-shadow: 0 2px 10px rgba(21, 101, 192, 0.15);

    &.sidebar-item--inicio {
      background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 100%);
    }

    &.sidebar-item--configuracion {
      background: linear-gradient(90deg, #e8eaf6 0%, #c5cae9 100%);
    }

    &.sidebar-item--desarrollo {
      background: linear-gradient(90deg, #ede7f6 0%, #d1c4e9 100%);
    }

    &.sidebar-item--soporte {
      background: linear-gradient(90deg, #e0f2f1 0%, #b2dfdb 100%);
    }

    &.sidebar-item--solicitudes {
      background: linear-gradient(90deg, #e3f2fd 0%, #bbdefb 100%);
    }

    &.sidebar-item--seguridad {
      background: linear-gradient(90deg, #eceff1 0%, #cfd8dc 100%);
    }
  }
}

.sidebar-item__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

.sidebar-group {
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  overflow: hidden;

  :deep(.q-expansion-item__container) {
    border: none;
  }

  :deep(.q-item) {
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  :deep(.sidebar-group__header) {
    padding: 8px 10px;
    min-height: 48px;
    background: linear-gradient(90deg, #ffffff 0%, #f8fafc 100%);
    border-bottom: 1px solid #eef2f7;
  }

  :deep(.sidebar-group__chevron) {
    color: #64748b;
    font-size: 20px;
  }

  &--configuracion :deep(.sidebar-group__header) {
    background: linear-gradient(90deg, #ffffff 0%, #f3f4fb 100%);
  }

  &--desarrollo :deep(.sidebar-group__header) {
    background: linear-gradient(90deg, #ffffff 0%, #f9f5fd 100%);
  }

  &--soporte :deep(.sidebar-group__header) {
    background: linear-gradient(90deg, #ffffff 0%, #f2fbfb 100%);
  }

  &--solicitudes :deep(.sidebar-group__header) {
    background: linear-gradient(90deg, #ffffff 0%, #f3f8ff 100%);
  }

  &--seguridad :deep(.sidebar-group__header) {
    background: linear-gradient(90deg, #ffffff 0%, #f5f7f8 100%);
  }
}

.sidebar-group__label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #475569;
}

:deep(.sidebar-group .q-expansion-item__content) {
  padding: 8px 6px 10px;
  background: #fafbfc;
}
</style>
