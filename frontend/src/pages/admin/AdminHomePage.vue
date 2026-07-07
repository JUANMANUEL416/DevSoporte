<template>
  <q-page class="admin-page">
    <section class="admin-hero">
      <div class="admin-hero__main">
        <span class="admin-hero__eyebrow">Área VIP · Atención personal</span>
        <h1 class="admin-hero__title">Menú administrativo</h1>
        <p class="admin-hero__subtitle">
          Clientes especiales de carácter personal, independientes del menú operativo de la empresa.
        </p>
      </div>
    </section>

    <section v-if="adminModules.length" class="admin-grid-section">
      <h2 class="admin-grid-title">Módulos</h2>
      <div class="admin-grid">
        <article
          v-for="m in adminModules"
          :key="m.resource"
          class="admin-card"
          tabindex="0"
          role="button"
          @click="goTo(m)"
          @keyup.enter="goTo(m)"
        >
          <div class="admin-card__stub">
            <q-icon :name="m.icon" size="22px" />
          </div>
          <div class="admin-card__body">
            <h3 class="admin-card__title">{{ m.title }}</h3>
            <p class="admin-card__desc">{{ m.description }}</p>
            <div class="admin-card__footer">
              <span>Abrir</span>
              <q-icon name="arrow_forward" size="14px" />
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="admin-empty">
      <q-icon name="construction" size="40px" color="orange-8" />
      <p class="admin-empty__title">Módulos en preparación</p>
      <p class="admin-empty__text">
        Aquí aparecerán los módulos VIP que vayamos desarrollando. Use el menú lateral o
        <strong>Regresar al menú operativo</strong> cuando termine.
      </p>
    </section>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { adminModules } from 'src/config/adminModules';

const router = useRouter();

function goTo(mod) {
  router.push(`/admin/${mod.path}`);
}
</script>

<style scoped>
.admin-page {
  box-sizing: border-box;
  min-height: calc(100dvh - 50px);
  padding: 10px 14px 12px;
  max-width: 1360px;
  margin: 0 auto;
  background: #fff8f0;
}

.admin-hero {
  padding: 14px 18px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: linear-gradient(120deg, #ef6c00 0%, #e65100 100%);
  color: #fff;
  box-shadow: 0 3px 12px rgba(230, 81, 0, 0.2);
}

.admin-hero__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-hero__eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.admin-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  opacity: 0.92;
  max-width: 640px;
}

.admin-grid-title {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8d6e63;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.admin-card {
  position: relative;
  display: flex;
  min-height: 96px;
  border: 1px solid #ffcc80;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  outline: none;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.admin-card:hover,
.admin-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(230, 81, 0, 0.12);
  border-color: #fb8c00;
}

.admin-card__stub {
  flex: 0 0 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 2px dashed rgba(230, 81, 0, 0.18);
  background: linear-gradient(180deg, #ffe0b2 0%, #ffcc80 100%);
  color: #e65100;
}

.admin-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
}

.admin-card__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.25;
  color: #0f172a;
}

.admin-card__desc {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.admin-card__footer {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #e65100;
}

.admin-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  padding: 24px;
  border: 1px dashed #ffcc80;
  border-radius: 12px;
  background: #fff;
  text-align: center;
}

.admin-empty__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #5d4037;
}

.admin-empty__text {
  margin: 0;
  max-width: 420px;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #8d6e63;
}
</style>
