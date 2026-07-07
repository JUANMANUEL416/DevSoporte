<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <q-banner v-if="runtime.isPruebas" dense class="bg-orange-9 text-white text-center">
      ENTORNO DE PRUEBAS — {{ runtime.database }} · Área administrativa VIP
    </q-banner>

    <q-header elevated class="admin-header text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <q-toolbar-title>Administrativo VIP</q-toolbar-title>
        <q-space />
        <span class="layout-version q-mr-md">
          v{{ appVersion }}<template v-if="runtime.isPruebas"> · Pruebas</template>
        </span>
        <div class="q-mr-md layout-user">{{ auth.user?.nombre || auth.user?.usuario }}</div>
        <q-btn flat dense round icon="logout" @click="logout">
          <q-tooltip>Salir del sistema</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above bordered :width="272" class="admin-sidebar">
      <q-scroll-area class="fit admin-sidebar-scroll">
        <q-list class="admin-sidebar-list">
          <q-item
            clickable
            v-ripple
            class="admin-sidebar-item admin-sidebar-item--back"
            @click="regresarOperativo"
          >
            <q-item-section avatar>
              <div class="admin-sidebar-icon admin-sidebar-icon--back">
                <q-icon name="arrow_back" size="18px" />
              </div>
            </q-item-section>
            <q-item-section class="admin-sidebar-item__label">Regresar al menú operativo</q-item-section>
          </q-item>

          <q-separator spaced />

          <q-item
            clickable
            v-ripple
            :to="'/admin'"
            exact
            class="admin-sidebar-item admin-sidebar-item--inicio"
            active-class="admin-sidebar-item--active"
          >
            <q-item-section avatar>
              <div class="admin-sidebar-icon admin-sidebar-icon--inicio">
                <q-icon name="home" size="18px" />
              </div>
            </q-item-section>
            <q-item-section class="admin-sidebar-item__label">Inicio</q-item-section>
          </q-item>

          <q-item
            v-for="m in adminModules"
            :key="m.resource"
            clickable
            v-ripple
            :to="`/admin/${m.path}`"
            class="admin-sidebar-item"
            active-class="admin-sidebar-item--active"
          >
            <q-item-section avatar>
              <div class="admin-sidebar-icon">
                <q-icon :name="m.icon" size="18px" />
              </div>
            </q-item-section>
            <q-item-section class="admin-sidebar-item__label">{{ m.title }}</q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { adminModules } from 'src/config/adminModules';
import { appApi } from 'src/services/api';

const drawer = ref(true);
const auth = useAuthStore();
const router = useRouter();
const appVersion = process.env.APP_VERSION || '0.0.0';
const runtime = ref({
  isPruebas: false,
  isProduction: false,
  appEnv: 'development',
  database: '',
});

function regresarOperativo() {
  auth.revokeAdmin();
  router.push('/');
}

function logout() {
  auth.logout();
  router.push('/login');
}

onMounted(async () => {
  try {
    const health = await appApi.health();
    runtime.value = {
      isPruebas: Boolean(health.isPruebas),
      isProduction: Boolean(health.isProduction),
      appEnv: health.appEnv || 'development',
      database: health.database || '',
    };
  } catch {
    // Sin API no bloquea la UI.
  }
});
</script>

<style scoped lang="scss">
.admin-header {
  background: linear-gradient(120deg, #ef6c00 0%, #e65100 100%);
}

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

.admin-sidebar {
  background: #fff8f0;
  border-right: 1px solid #ffcc80 !important;
}

.admin-sidebar-scroll {
  padding: 8px;
}

.admin-sidebar-list {
  :deep(.q-item) {
    min-height: 40px;
  }
}

.admin-sidebar-item {
  margin-bottom: 5px;
  padding: 4px 8px 4px 4px;
  border-radius: 8px;
  border: 1px solid #ffcc80;
  background: #fff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  :deep(.q-item__section--avatar) {
    min-width: 40px;
    padding-right: 6px;
    border-right: 2px dashed rgba(230, 81, 0, 0.15);
    margin-right: 4px;
  }

  &:hover {
    border-color: #fb8c00;
    box-shadow: 0 4px 12px rgba(230, 81, 0, 0.12);
    transform: translateX(2px);
  }

  &--active {
    border-color: #e65100 !important;
    background: linear-gradient(90deg, #ffe0b2 0%, #fff3e0 100%);
    box-shadow: 0 2px 10px rgba(230, 81, 0, 0.15);
  }

  &--back {
    background: linear-gradient(90deg, #fff 0%, #fff8f0 100%);
    border-color: #90a4ae;

    &:hover {
      border-color: #546e7a;
    }
  }

  &--inicio {
    background: linear-gradient(90deg, #fff3e0 0%, #fff 100%);
  }
}

.admin-sidebar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #ffcc80;
  background: linear-gradient(180deg, #ffe0b2 0%, #ffcc80 100%);
  color: #e65100;

  &--back {
    background: linear-gradient(180deg, #eceff1 0%, #cfd8dc 100%);
    border-color: #b0bec5;
    color: #455a64;
  }

  &--inicio {
    background: linear-gradient(180deg, #ffe0b2 0%, #ffb74d 100%);
    border-color: #ffb74d;
  }
}

.admin-sidebar-item__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #5d4037;
}
</style>
