import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted } from 'vue'

import { useModelStore } from '../stores/model-store'

/**
 * Registers global keyboard shortcuts that move or reset the model position.
 * Which keys are bound and how large each step is are driven by the model store
 * (persisted in localStorage) so the user can configure them in settings.
 *
 * Keys are compared case-insensitively so `r` and `R` both work for reset.
 * The handler is skipped when focus is inside a text input or content-editable
 * element to avoid conflicts with normal typing.
 */
export function useModelPositionHotkeys() {
  const modelStore = useModelStore()
  const { modelOffset, modelPositionStep, modelPositionKeys } = storeToRefs(modelStore)

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
    ) {
      return
    }

    const keys = modelPositionKeys.value
    const step = modelPositionStep.value
    const key = event.key.toLowerCase()

    if (key === keys.left.toLowerCase()) {
      event.preventDefault()
      // NOTICE: The camera faces the model from the front, so world +X appears
      // as left on screen. Moving "left" from the user's POV requires increasing X.
      modelOffset.value.x += step
    }
    else if (key === keys.right.toLowerCase()) {
      event.preventDefault()
      modelOffset.value.x -= step
    }
    else if (key === keys.up.toLowerCase()) {
      event.preventDefault()
      modelOffset.value.y += step
    }
    else if (key === keys.down.toLowerCase()) {
      event.preventDefault()
      modelOffset.value.y -= step
    }
    else if (key === keys.reset.toLowerCase()) {
      event.preventDefault()
      modelOffset.value = { x: 0, y: 0, z: 0 }
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
}
