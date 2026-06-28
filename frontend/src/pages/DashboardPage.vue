<template>
  <q-page class="dashboard-page">
    <section class="dashboard-hero">
      <div class="dashboard-hero__main">
        <span class="dashboard-hero__eyebrow">Panel de control</span>
        <h1 class="dashboard-hero__title">
          Bienvenido{{ userName ? `, ${userName}` : '' }}
        </h1>
      </div>
      <span class="dashboard-hero__date">
        <q-icon name="today" size="15px" />
        {{ todayLabel }}
      </span>
    </section>

    <section class="dashboard-shortcuts">
      <h2 class="dashboard-shortcuts__title">Módulos</h2>

      <div class="ticket-grid">
        <article
          v-for="m in modules"
          :key="m.resource"
          class="ticket-card"
          :class="`ticket-card--${groupKey(m.group)}`"
          tabindex="0"
          role="button"
          @click="goTo(m.resource)"
          @keyup.enter="goTo(m.resource)"
        >
          <div class="ticket-card__stub" aria-hidden="true">
            <q-icon :name="m.icon" size="20px" />
          </div>

          <div class="ticket-card__body">
            <div class="ticket-card__row">
              <span class="ticket-card__group">{{ m.group }}</span>
              <q-icon name="arrow_forward" class="ticket-card__arrow" size="14px" />
            </div>
            <h3 class="ticket-card__title">{{ m.title }}</h3>
            <div v-if="cardStat(m.resource)" class="ticket-card__stat">
              <q-spinner-dots v-if="loadingStats" color="primary" size="16px" />
              <template v-else>
                <strong>{{ cardStat(m.resource).value }}</strong>
                <span>{{ cardStat(m.resource).label }}</span>
              </template>
            </div>
          </div>
        </article>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { visibleModules } from 'src/config/modules';
import { dashboardApi } from 'src/services/api';

const router = useRouter();
const auth = useAuthStore();
const modules = visibleModules();
const loadingStats = ref(true);
const stats = ref({
  clientes: 0,
  bitacorasMes: 0,
  capacitacionesMes: 0,
});

const userName = computed(() => auth.user?.nombre || auth.user?.usuario || '');

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
});

const monthLabel = computed(() => {
  return new Date().toLocaleDateString('es-CO', { month: 'long' });
});

function groupKey(group) {
  return group
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function cardStat(resource) {
  if (loadingStats.value) {
    if (['clientes', 'bitacora', 'capacitaciones'].includes(resource)) {
      return { value: '—', label: '' };
    }
    return null;
  }

  switch (resource) {
    case 'clientes':
      return {
        value: stats.value.clientes,
        label: stats.value.clientes === 1 ? 'cliente' : 'clientes',
      };
    case 'bitacora':
      return {
        value: stats.value.bitacorasMes,
        label: monthLabel.value,
      };
    case 'capacitaciones':
      return {
        value: stats.value.capacitacionesMes,
        label: monthLabel.value,
      };
    default:
      return null;
  }
}

function goTo(resource) {
  router.push(`/${resource}`);
}

onMounted(async () => {
  try {
    stats.value = await dashboardApi.stats();
  } catch {
    // El dashboard sigue usable aunque fallen las estadísticas.
  } finally {
    loadingStats.value = false;
  }
});
</script>

<style scoped lang="scss">
.dashboard-page {
  --ticket-stub: 46px;
  --page-bg: #eef2f7;
  box-sizing: border-box;
  min-height: calc(100dvh - 50px);
  max-height: calc(100dvh - 50px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px 14px 12px;
  max-width: 1360px;
  margin: 0 auto;
  background: var(--page-bg);
}

.dashboard-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 10px 16px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: linear-gradient(120deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
  box-shadow: 0 3px 12px rgba(13, 71, 161, 0.18);
}

.dashboard-hero__main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
}

.dashboard-hero__eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.82;
}

.dashboard-hero__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dashboard-hero__date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.72rem;
  text-transform: capitalize;
  white-space: nowrap;
}

.dashboard-shortcuts {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dashboard-shortcuts__title {
  margin: 0 0 8px;
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.ticket-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}

.ticket-card {
  position: relative;
  display: flex;
  min-height: 86px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  outline: none;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: calc(var(--ticket-stub) - 6px);
    z-index: 2;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--page-bg);
    border: 1px solid #cbd5e1;
  }

  &::before {
    top: -7px;
  }

  &::after {
    bottom: -7px;
  }

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
    border-color: #94a3b8;

    .ticket-card__arrow {
      transform: translateX(3px);
      opacity: 1;
    }
  }

  &--configuracion {
    border-color: #c5cae9;

    .ticket-card__stub {
      background: linear-gradient(180deg, #e8eaf6 0%, #c5cae9 100%);
      color: #3949ab;
    }
  }

  &--desarrollo {
    border-color: #d1c4e9;

    .ticket-card__stub {
      background: linear-gradient(180deg, #ede7f6 0%, #d1c4e9 100%);
      color: #5e35b1;
    }
  }

  &--soporte {
    border-color: #b2dfdb;

    .ticket-card__stub {
      background: linear-gradient(180deg, #e0f2f1 0%, #b2dfdb 100%);
      color: #00695c;
    }
  }

  &--solicitudes {
    border-color: #bbdefb;

    .ticket-card__stub {
      background: linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%);
      color: #1565c0;
    }
  }

  &--seguridad {
    border-color: #cfd8dc;

    .ticket-card__stub {
      background: linear-gradient(180deg, #eceff1 0%, #cfd8dc 100%);
      color: #455a64;
    }
  }
}

.ticket-card__stub {
  position: relative;
  flex: 0 0 var(--ticket-stub);
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 2px dashed rgba(15, 23, 42, 0.14);
}

.ticket-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 8px 10px 8px 8px;
}

.ticket-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.ticket-card__group {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ticket-card__arrow {
  flex-shrink: 0;
  color: #1565c0;
  opacity: 0.55;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.ticket-card__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.25;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ticket-card__stat {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-height: 16px;
  font-size: 0.68rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  strong {
    font-size: 0.92rem;
    font-weight: 800;
    color: #0f172a;
  }

  span {
    text-transform: capitalize;
  }
}

@media (max-width: 1199px) {
  .ticket-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 991px) {
  .ticket-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-page {
    max-height: none;
    overflow: auto;
  }
}

@media (max-width: 599px) {
  .dashboard-page {
    padding: 8px 10px;
  }

  .dashboard-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px;
  }

  .dashboard-hero__title {
    white-space: normal;
  }

  .ticket-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .ticket-card {
    min-height: 78px;
  }
}
</style>
