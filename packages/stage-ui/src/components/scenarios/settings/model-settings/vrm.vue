<script setup lang="ts">
import type { ModelPositionKeys } from '@proj-airi/stage-ui-three'
import type { AnimationKey } from '@proj-airi/stage-ui-three/assets/vrm'

import type { ModelSettingsRuntimeSnapshot } from './runtime'

import { useModelStore } from '@proj-airi/stage-ui-three'
import { animations } from '@proj-airi/stage-ui-three/assets/vrm'
import { Button, Callout, FieldCombobox, SelectTab } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSettingsVrm } from '../../../../stores/settings/vrm'
import { Container, PropertyColor, PropertyNumber, PropertyPoint } from '../../../data-pane'
import { ColorPalette } from '../../../widgets'

const props = withDefaults(defineProps<{
  palette: string[]
  allowExtractColors?: boolean
  runtimeSnapshot: ModelSettingsRuntimeSnapshot
}>(), {
  allowExtractColors: true,
})
defineEmits<{
  (e: 'extractColorsFromModel'): void
}>()
const RE_UPPER = /([A-Z])/g
const RE_DIGIT = /(\d+)/g
const RE_WORD_START = /\b\w/g

const { t } = useI18n()

const modelStore = useModelStore()
const {
  modelSize,
  modelOffset,
  modelPositionStep,
  modelPositionKeys,
  cameraFOV,
  modelRotationY,
  cameraDistance,
  trackingMode,

  directionalLightRotation,
  directionalLightIntensity,
  directionalLightColor,

  ambientLightIntensity,
  ambientLightColor,

  hemisphereLightIntensity,
  hemisphereSkyColor,
  hemisphereGroundColor,

  envSelect,
  skyBoxIntensity,
  renderScale,
} = storeToRefs(modelStore)
const controlsLocked = computed(() => props.runtimeSnapshot.controlsLocked)
const canExtractColors = computed(() => props.runtimeSnapshot.canCapturePreview)

const vrmSettings = useSettingsVrm()
const { vrmIdleAnimation } = storeToRefs(vrmSettings)

/** Converts a camelCase animation key to a human-readable label. */
function animationLabel(key: string): string {
  return key
    .replace(RE_UPPER, ' $1')
    .replace(RE_DIGIT, ' $1')
    .trim()
    .replace(RE_WORD_START, c => c.toUpperCase())
}

const animationOptions = computed(() =>
  (Object.keys(animations) as AnimationKey[]).map(key => ({
    value: key,
    label: animationLabel(key),
  })),
)
const trackingOptions = computed<{
  value: 'camera' | 'mouse' | 'none'
  label: string
  class: string
}[]>(() => [
  { value: 'camera', label: t('settings.vrm.scale-and-position.eye-tracking-mode.options.option.camera'), class: 'col-start-3' },
  { value: 'mouse', label: t('settings.vrm.scale-and-position.eye-tracking-mode.options.option.mouse'), class: 'col-start-4' },
  { value: 'none', label: t('settings.vrm.scale-and-position.eye-tracking-mode.options.option.disabled'), class: 'col-start-5' },
])

// === Position hotkeys ===
const capturing = ref<keyof ModelPositionKeys | null>(null)

/** Returns a short human-readable label for a KeyboardEvent.key value. */
function formatKey(key: string): string {
  const map: Record<string, string> = {
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    ' ': 'Space',
    'Escape': 'Esc',
    'Delete': 'Del',
    'Backspace': '⌫',
    'Enter': '↵',
    'Tab': '⇥',
  }
  return map[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

function captureKey(action: keyof ModelPositionKeys) {
  capturing.value = action

  function onKeydown(event: KeyboardEvent) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.key !== 'Escape')
      modelPositionKeys.value = { ...modelPositionKeys.value, [action]: event.key }
    capturing.value = null
    document.removeEventListener('keydown', onKeydown, true)
  }

  // Use capture phase so this runs before the hotkey handler
  document.addEventListener('keydown', onKeydown, true)
}

// switch between hemisphere light and sky box
const settingsLockClass = computed(() => {
  return controlsLocked.value ? ['pointer-events-none', 'opacity-60'] : []
})

const envOptions = computed(() => [
  {
    value: 'hemisphere',
    label: 'Hemisphere',
    icon: envSelect.value === 'hemisphere'
      ? 'i-solar:forbidden-circle-bold rotate-45'
      : 'i-solar:forbidden-circle-linear rotate-45',
  },
  {
    value: 'skyBox',
    label: 'SkyBox',
    icon: envSelect.value === 'skyBox'
      ? 'i-solar:gallery-circle-bold'
      : 'i-solar:gallery-circle-linear',
  },
])
</script>

<template>
  <Container
    :title="t('settings.pages.models.sections.section.scene')"
    icon="i-solar:people-nearby-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <template v-if="allowExtractColors">
      <ColorPalette class="mb-4 mt-2" :colors="palette.map(hex => ({ hex, name: hex }))" mx-auto />
      <Button variant="secondary" :disabled="controlsLocked || !canExtractColors" @click="$emit('extractColorsFromModel')">
        {{ t('settings.vrm.theme-color-from-model.button-extract.title') }}
      </Button>
    </template>

    <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
      <PropertyPoint
        v-model:x="modelOffset.x"
        v-model:y="modelOffset.y"
        v-model:z="modelOffset.z"
        :disabled="controlsLocked"
        label="Model Position"
        :x-config="{ min: -modelSize.x * 2, max: modelSize.x * 2, step: modelSize.x / 10000, label: 'X', formatValue: val => val?.toFixed(4) }"
        :y-config="{ min: -modelSize.y * 2, max: modelSize.y * 2, step: modelSize.y / 10000, label: 'Y', formatValue: val => val?.toFixed(4) }"
        :z-config="{ min: -modelSize.z * 2, max: modelSize.z * 2, step: modelSize.z / 10000, label: 'Z', formatValue: val => val?.toFixed(4) }"
      />
      <PropertyNumber
        v-model="renderScale"
        :config="{ min: 0.5, max: 2, step: 0.25, label: t('settings.vrm.render-scale.title'), formatValue: val => val?.toFixed(2), disabled: controlsLocked }"
        :label="t('settings.vrm.render-scale.title')"
      />
      <PropertyNumber
        v-model="cameraFOV"
        :config="{ min: 1, max: 180, step: 1, label: t('settings.vrm.scale-and-position.fov'), disabled: controlsLocked }"
        :label="t('settings.vrm.scale-and-position.fov')"
      />
      <PropertyNumber
        v-model="cameraDistance"
        :config="{ min: modelSize.z, max: modelSize.z * 20, step: modelSize.z / 100, label: t('settings.vrm.scale-and-position.camera-distance'), formatValue: val => val?.toFixed(4), disabled: controlsLocked }"
        :label="t('settings.vrm.scale-and-position.camera-distance')"
      />
      <PropertyNumber
        v-model="modelRotationY"
        :config="{ min: -180, max: 180, step: 1, label: t('settings.vrm.scale-and-position.rotation-y'), disabled: controlsLocked }"
        :label="t('settings.vrm.scale-and-position.rotation-y')"
      />

      <!-- Set eye tracking mode -->
      <div class="text-xs">
        {{ t('settings.vrm.scale-and-position.eye-tracking-mode.title') }}:
      </div>
      <div />
      <template v-for="option in trackingOptions" :key="option.value">
        <Button
          :class="[option.class, 'w-auto']"
          :disabled="controlsLocked"
          size="sm"
          :variant="trackingMode === option.value ? 'primary' : 'secondary'"
          :label="option.label"
          @click="trackingMode = option.value"
        />
      </template>

      <PropertyNumber
        v-model="directionalLightRotation.x"
        :config="{ min: -180, max: 180, step: 1, label: 'RotationXDeg', formatValue: val => val?.toFixed(0), disabled: controlsLocked }"
        label="Directional Light Rotation - X"
      />
      <PropertyNumber
        v-model="directionalLightRotation.y"
        :config="{ min: -180, max: 180, step: 1, label: 'RotationYDeg', formatValue: val => val?.toFixed(0), disabled: controlsLocked }"
        label="Directional Light Rotation - Y"
      />
      <PropertyColor
        v-model="directionalLightColor"
        :disabled="controlsLocked"
        label="Directional Light Color"
      />

      <PropertyNumber
        v-model="directionalLightIntensity"
        :config="{ min: 0, max: 10, step: 0.01, label: 'Intensity', disabled: controlsLocked }"
        label="Directional Light Intensity"
      />

      <PropertyNumber
        v-model="ambientLightIntensity"
        :config="{ min: 0, max: 10, step: 0.01, label: 'Intensity', disabled: controlsLocked }"
        label="Ambient Light Intensity"
      />
      <PropertyColor
        v-model="ambientLightColor"
        :disabled="controlsLocked"
        label="Ambient Light Color"
      />
    </div>
    <div>
      <div
        :class="[
          'px-2',
          'pt-2',
          'text-xs',
          'text-neutral-500',
          'dark:text-neutral-400',
        ]"
      >
        Environment
      </div>
      <div :class="['p-2', ...settingsLockClass]">
        <SelectTab v-model="envSelect" :options="envOptions" :disabled="controlsLocked" size="sm" />
      </div>
      <div v-if="envSelect === 'hemisphere'">
        <!-- hemisphere settings -->
        <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
          <PropertyNumber
            v-model="hemisphereLightIntensity"
            :config="{ min: 0, max: 10, step: 0.01, label: 'Intensity', disabled: controlsLocked }"
            label="Hemisphere Light Intensity"
          />
          <PropertyColor
            v-model="hemisphereSkyColor"
            :disabled="controlsLocked"
            label="Hemisphere Sky Color"
          />
          <PropertyColor
            v-model="hemisphereGroundColor"
            :disabled="controlsLocked"
            label="Hemisphere Ground Color"
          />
        </div>
      </div>
      <div v-else>
        <!-- skybox settings -->
        <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
          <PropertyNumber
            v-model="skyBoxIntensity"
            :config="{ min: 0, max: 1, step: 0.01, label: 'Intensity', disabled: controlsLocked }"
            :label="t('settings.vrm.skybox.skybox-intensity')"
          />
        </div>
      </div>
    </div>
    <div p-2>
      <FieldCombobox
        v-model="vrmIdleAnimation"
        :label="t('settings.vrm.idle-animation.title')"
        :options="animationOptions"
        :disabled="controlsLocked"
      />
    </div>
    <!-- Position hotkeys -->
    <div :class="['px-2', 'pt-2', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
      Position Hotkeys
    </div>
    <div :class="['p-2', ...settingsLockClass]">
      <div :class="['grid', 'grid-cols-[1fr_auto]', 'items-center', 'gap-x-3', 'gap-y-1', 'text-xs']">
        <span class="text-neutral-600 dark:text-neutral-400">Step size</span>
        <input
          v-model.number="modelPositionStep"
          type="number"
          min="0.001"
          step="0.001"
          :disabled="controlsLocked"
          :class="[
            'w-20 rounded-md px-1.5 py-0.5 text-right font-mono',
            'bg-neutral-100 dark:bg-neutral-900',
            'outline-none',
            'disabled:opacity-50',
          ]"
        >
        <template
          v-for="(action, label) in ({
            'Move left': 'left',
            'Move right': 'right',
            'Move up': 'up',
            'Move down': 'down',
            'Reset position': 'reset',
          } as Record<string, keyof ModelPositionKeys>)" :key="action"
        >
          <span class="text-neutral-600 dark:text-neutral-400">{{ label }}</span>
          <button
            :disabled="controlsLocked"
            :class="[
              'min-w-14 rounded-md px-2 py-0.5 font-mono text-center text-xs',
              'transition-colors duration-150',
              capturing === action
                ? ['bg-blue-500/20', 'text-blue-600', 'dark:text-blue-400', 'ring-1', 'ring-blue-400']
                : ['bg-neutral-100', 'dark:bg-neutral-900', 'hover:bg-neutral-200', 'dark:hover:bg-neutral-800'],
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ]"
            @click="captureKey(action)"
          >
            {{ capturing === action ? '…' : formatKey(modelPositionKeys[action]) }}
          </button>
        </template>
      </div>
    </div>
  </Container>
  <Container
    :title="t('settings.vrm.change-model.title')"
    icon="i-solar:magic-stick-3-bold-duotone"
    inner-class="text-sm"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout :label="t('settings.vrm.scale-and-position.model-info-title')">
      <div>
        <div class="text-sm text-neutral-600 space-y-1 dark:text-neutral-400">
          <div class="flex justify-between">
            <span>{{ t('settings.vrm.scale-and-position.model-info-x') }}</span>
            <span>{{ modelSize.x.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('settings.vrm.scale-and-position.model-info-y') }}</span>
            <span>{{ modelSize.y.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('settings.vrm.scale-and-position.model-info-z') }}</span>
            <span>{{ modelSize.z.toFixed(4) }}</span>
          </div>
        </div>
      </div>
    </Callout>
    <Callout
      theme="lime"
      label="Tips!"
    >
      <div class="text-sm text-neutral-600 space-y-1 dark:text-neutral-400">
        {{ t('settings.vrm.scale-and-position.tips') }}
      </div>
    </Callout>
  </Container>
</template>
