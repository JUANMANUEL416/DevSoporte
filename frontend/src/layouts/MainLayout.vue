<template>
  <q-layout view="hHh lpR fFf">
    <q-banner v-if="runtime.isPruebas" dense class="bg-orange-9 text-white text-center">
      ENTORNO DE PRUEBAS — {{ runtime.database }} · Producción sigue activa en puerto 3300
    </q-banner>
    <q-header elevated :class="runtime.isPruebas ? 'bg-orange-9 text-white' : 'bg-primary text-white'">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <q-toolbar-title>DevSoporte</q-toolbar-title>
        <q-space />
        <span class="layout-version q-mr-md">
          v{{ appVersion }}<template v-if="runtime.isPruebas"> · Pruebas</template>
        </span>
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

          <q-item
            clickable
            v-ripple
            class="sidebar-item sidebar-item--administrativo"
            @click="abrirAccesoAdmin"
          >
            <q-item-section avatar>
              <div class="sidebar-icon sidebar-icon--administrativo">
                <q-icon name="admin_panel_settings" size="18px" />
              </div>
            </q-item-section>
            <q-item-section class="sidebar-item__label">Administrativo</q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Diálogo de acceso administrativo -->
    <q-dialog v-model="adminDialogOpen" persistent>
      <q-card class="admin-dialog">
        <div class="admin-dialog__header">
          <q-icon name="admin_panel_settings" size="22px" />
          <span>Acceso administrativo</span>
        </div>
        <q-card-section class="q-pt-md">
          <p class="text-caption text-grey-7 q-mt-none">
            Ingrese la clave para acceder al menú administrativo VIP.
          </p>
          <q-form @submit="confirmarAccesoAdmin">
            <q-input
              v-model="adminClave"
              :type="adminShowClave ? 'text' : 'password'"
              label="Clave de acceso"
              outlined
              dense
              autofocus
              autocomplete="off"
              :rules="[(v) => !!String(v || '').trim() || 'Requerido']"
            >
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  :icon="adminShowClave ? 'visibility_off' : 'visibility'"
                  @click="adminShowClave = !adminShowClave"
                />
              </template>
            </q-input>
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat no-caps label="Cancelar" color="grey-7" :disable="adminLoading" v-close-popup />
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Entrar"
                icon="lock_open"
                :loading="adminLoading"
                type="submit"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { modulesByGroup } from 'src/config/modules';
import { appApi, authApi } from 'src/services/api';

const drawer = ref(true);
const auth = useAuthStore();
const router = useRouter();
const $q = useQuasar();
const appVersion = process.env.APP_VERSION || '0.0.0';
const runtime = ref({
  isPruebas: false,
  isProduction: false,
  appEnv: 'development',
  database: '',
});
const groups = modulesByGroup();
const expandedGroups = ref(
  Object.fromEntries(Object.keys(groups).map((group) => [group, true])),
);

// Acceso administrativo
const adminDialogOpen = ref(false);
const adminClave = ref('');
const adminShowClave = ref(false);
const adminLoading = ref(false);

async function abrirAccesoAdmin() {
  adminClave.value = '';
  adminShowClave.value = false;
  adminDialogOpen.value = true;
}

async function confirmarAccesoAdmin() {
  adminLoading.value = true;
  try {
    await authApi.validarAdmin(adminClave.value);
    auth.grantAdmin();
    adminDialogOpen.value = false;
    router.push('/admin');
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo validar la clave',
    });
  } finally {
    adminLoading.value = false;
  }
}

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
    // Sin API (p. ej. login) no bloquea la UI.
  }
});
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
  padding: 8px 8px;
}

.sidebar-list {
  :deep(.q-item) {
    min-height: 38px;
  }

  :deep(.q-separator) {
    display: none;
  }
}

.sidebar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid transparent;
  color: #1e293b;

  &--sm {
    width: 28px;
    height: 28px;
    border-radius: 6px;
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
  position: relative;
  margin-bottom: 4px;
  padding: 4px 8px 4px 4px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 38px;
    z-index: 1;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
  }

  &::before {
    top: -5px;
  }

  &::after {
    bottom: -5px;
  }

  :deep(.q-item__section--avatar) {
    min-width: 40px;
    padding-right: 6px;
    border-right: 2px dashed rgba(15, 23, 42, 0.12);
    margin-right: 4px;
  }

  &--sub {
    margin-left: 6px;
    margin-right: 2px;
    padding: 3px 8px 3px 3px;

    :deep(.q-item__section--avatar) {
      min-width: 36px;
    }

    &::before,
    &::after {
      left: 34px;
    }
  }

  &--inicio {
    background: linear-gradient(90deg, #eff6ff 0%, #fff 100%);
    border-color: #bfdbfe;
  }

  &--configuracion {
    background: linear-gradient(90deg, #fafbff 0%, #fff 100%);
    border-color: #c5cae9;
  }

  &--desarrollo {
    background: linear-gradient(90deg, #fdfbff 0%, #fff 100%);
    border-color: #d1c4e9;
  }

  &--soporte {
    background: linear-gradient(90deg, #f6fffe 0%, #fff 100%);
    border-color: #b2dfdb;
  }

  &--solicitudes {
    background: linear-gradient(90deg, #f5faff 0%, #fff 100%);
    border-color: #bbdefb;
  }

  &--seguridad {
    background: linear-gradient(90deg, #fafbfc 0%, #fff 100%);
    border-color: #cfd8dc;
  }

  &:hover {
    border-color: #64748b;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    transform: translateX(2px);
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

.sidebar-item--administrativo {
  margin-top: 6px;
  background: linear-gradient(90deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;

  &::before,
  &::after {
    left: 38px;
  }

  &:hover {
    border-color: #fb8c00;
    transform: translateX(2px);
  }
}

.sidebar-icon--administrativo {
  background: linear-gradient(90deg, #ffe0b2 0%, #ffb74d 100%);
  border-color: #ffb74d;
  color: #e65100;
}

.admin-dialog {
  width: min(420px, 94vw);
  border-radius: 14px;
  overflow: hidden;
}

.admin-dialog__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  background: linear-gradient(90deg, #ef6c00 0%, #e65100 100%);
  color: #fff;
  font-weight: 700;
}

.sidebar-item__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}

.sidebar-group {
  margin-bottom: 5px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
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
    padding: 5px 8px;
    min-height: 40px;
    background: linear-gradient(90deg, #ffffff 0%, #f8fafc 100%);
    border-bottom: 1px dashed #dbeafe;
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
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #475569;
}

:deep(.sidebar-group .q-expansion-item__content) {
  padding: 4px 4px 6px;
  background: #f8fafc;
}
</style>
