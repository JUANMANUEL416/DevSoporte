<template>
  <q-page class="dashboard-page">
    <!-- Hero -->
    <section class="dashboard-hero">
      <div class="dashboard-hero__content">
        <div class="dashboard-hero__headline">
          <span class="dashboard-hero__eyebrow">Panel de control</span>
          <h1 class="dashboard-hero__title">
            Bienvenido{{ userName ? `, ${userName}` : '' }}
          </h1>
        </div>
        <p class="dashboard-hero__subtitle">
          Gestione soporte, clientes y capacitaciones desde un solo lugar.
        </p>
      </div>
      <div class="dashboard-hero__meta">
        <span class="dashboard-hero__date">
          <q-icon name="today" size="16px" />
          {{ todayLabel }}
        </span>
      </div>
    </section>

    <!-- Accesos directos -->
    <section class="dashboard-shortcuts">
      <h2 class="dashboard-shortcuts__title">Accesos directos</h2>

      <div class="row q-col-gutter-md">
        <div
          v-for="m in modules"
          :key="m.resource"
          class="col-12 col-sm-6 col-md-3"
        >
          <article
            class="shortcut-card"
            :class="`shortcut-card--${groupKey(m.group)}`"
            tabindex="0"
            role="button"
            @click="goTo(m.resource)"
            @keyup.enter="goTo(m.resource)"
          >
            <div class="shortcut-card__head">
              <div class="shortcut-card__icon">
                <q-icon :name="m.icon" size="22px" />
              </div>
              <span class="shortcut-card__group">{{ m.group }}</span>
            </div>

            <h3 class="shortcut-card__title">{{ m.title }}</h3>

            <div v-if="cardStat(m.resource)" class="shortcut-card__stat">
              <q-spinner-dots v-if="loadingStats" color="primary" size="20px" />
              <template v-else>
                <span class="shortcut-card__stat-value">{{ cardStat(m.resource).value }}</span>
                <span class="shortcut-card__stat-label">{{ cardStat(m.resource).label }}</span>
              </template>
            </div>
            <p v-else class="shortcut-card__hint">Acceso rápido al módulo</p>

            <div class="shortcut-card__footer">
              <span>Abrir módulo</span>
              <q-icon name="arrow_forward" size="16px" />
            </div>
          </article>
        </div>
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
        label: stats.value.clientes === 1 ? 'cliente registrado' : 'clientes registrados',
      };
    case 'bitacora':
      return {
        value: stats.value.bitacorasMes,
        label: `en ${monthLabel.value}`,
      };
    case 'capacitaciones':
      return {
        value: stats.value.capacitacionesMes,
        label: `en ${monthLabel.value}`,
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
  padding: 16px 20px;
  max-width: 1280px;
  margin: 0 auto;
}

.dashboard-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 20px;
  margin-bottom: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 55%, #1a237e 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(13, 71, 161, 0.2);
}

.dashboard-hero__headline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
}

.dashboard-hero__eyebrow {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.dashboard-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.dashboard-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
  line-height: 1.35;
  opacity: 0.88;
}

.dashboard-hero__date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
  text-transform: capitalize;
  white-space: nowrap;
}

.dashboard-shortcuts__title {
  margin: 0 0 14px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
}

.shortcut-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
    border-color: transparent;
  }

  &--configuracion {
    background: linear-gradient(180deg, #fafbff 0%, #ffffff 38%);
    border-color: #c5cae9;

    .shortcut-card__head {
      background: linear-gradient(90deg, #e8eaf6 0%, #9fa8da 100%);
    }

    .shortcut-card__icon { color: #3949ab; }
  }

  &--soporte {
    background: linear-gradient(180deg, #f6fffe 0%, #ffffff 38%);
    border-color: #b2dfdb;

    .shortcut-card__head {
      background: linear-gradient(90deg, #e0f2f1 0%, #80cbc4 100%);
    }

    .shortcut-card__icon { color: #00695c; }
  }
}

.shortcut-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -16px -16px 14px;
  padding: 12px 14px;
  border-radius: 12px 12px 0 0;
}

.shortcut-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.shortcut-card__group {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.shortcut-card__title {
  margin: 0 0 10px;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.shortcut-card__stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-height: 32px;
  margin-bottom: 12px;
}

.shortcut-card__stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  color: #0f172a;
}

.shortcut-card__stat-label {
  font-size: 0.78rem;
  color: #64748b;
  text-transform: capitalize;
}

.shortcut-card__hint {
  margin: 0 0 12px;
  min-height: 32px;
  font-size: 0.78rem;
  color: #94a3b8;
}

.shortcut-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
  font-size: 0.78rem;
  font-weight: 500;
  color: #1565c0;

  .q-icon {
    transition: transform 0.2s ease;
  }

  .shortcut-card:hover & .q-icon,
  .shortcut-card:focus-visible & .q-icon {
    transform: translateX(4px);
  }
}

@media (max-width: 599px) {
  .dashboard-page {
    padding: 12px;
  }

  .dashboard-hero {
    padding: 12px 14px;
  }

  .dashboard-hero__title {
    font-size: 1.05rem;
  }
}
</style>
