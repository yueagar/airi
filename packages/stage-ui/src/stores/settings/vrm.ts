import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'

export const useSettingsVrm = defineStore('settings-vrm', () => {
  const vrmIdleAnimation = useLocalStorageManualReset<string>('settings/vrm/idle-animation', 'idleLoop')

  function resetState() {
    vrmIdleAnimation.reset()
  }

  return {
    vrmIdleAnimation,
    resetState,
  }
})
